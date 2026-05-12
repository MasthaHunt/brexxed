/**
 * Vaulta — production Express server
 *
 * Responsibilities:
 *   1. Serve the built Vite SPA from /dist
 *   2. Expose /api/state  (GET / POST / DELETE)  — replaces public/api/state.php
 *   3. SPA catch-all so React Router handles client-side navigation
 *
 * Environment variables (all provided by Railway automatically when a MySQL
 * plugin is attached, plus the two you set manually):
 *
 *   API_SECRET       — shared secret that gates the API  (set this yourself)
 *   VITE_API_SECRET  — same value; baked into the frontend bundle at build time
 *   MYSQLHOST        — injected by Railway MySQL plugin
 *   MYSQLPORT        — injected by Railway MySQL plugin
 *   MYSQLUSER        — injected by Railway MySQL plugin
 *   MYSQLPASSWORD    — injected by Railway MySQL plugin
 *   MYSQLDATABASE    — injected by Railway MySQL plugin
 *   PORT             — injected by Railway (do not set this yourself)
 */

import express from "express";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET ?? "";

app.use(express.json({ limit: "5mb" }));

// ── Redirect bare domain to www ──────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.headers.host === "brexledger.com") {
    return res.redirect(301, `https://www.brexledger.com${req.url}`);
  }
  next();
});

// ── Static files (built Vite app) ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "dist")));

// ── Database pool (created lazily on first API request) ──────────────────────
let pool = null;

// Railway does NOT always auto-inject MySQL plugin vars into the App service.
// You must manually reference them in Railway's Variables tab, e.g.:
//   DATABASE_URL = ${{ MYSQL.MYSQL_PUBLIC_URL }}
//
// Fall-back chain (first truthy value wins):
//   DATABASE_URL          — manually mapped in Railway (preferred)
//   MYSQL_PUBLIC_URL      — public IPv4 URL (auto-injected on some plans)
//   MYSQL_URL             — may be private IPv6; avoid if possible
//   MYSQL_PRIVATE_URL     — private IPv6 (causes ECONNREFUSED on some setups)
const MYSQL_URL      = process.env.DATABASE_URL
                    ?? process.env.MYSQL_PUBLIC_URL
                    ?? process.env.MYSQL_URL
                    ?? process.env.MYSQL_PRIVATE_URL;
const MYSQL_HOST     = process.env.MYSQLHOST ?? process.env.MYSQL_HOST;
const MYSQL_PORT     = Number(process.env.MYSQLPORT ?? process.env.MYSQL_PORT ?? 3306);
const MYSQL_USER     = process.env.MYSQLUSER ?? process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQLPASSWORD ?? process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQLDATABASE ?? process.env.MYSQL_DATABASE;

const MYSQL_CONFIGURED = !!(MYSQL_URL || MYSQL_HOST);

if (MYSQL_CONFIGURED) {
  const via = process.env.DATABASE_URL       ? "DATABASE_URL"
            : process.env.MYSQL_PUBLIC_URL  ? "MYSQL_PUBLIC_URL"
            : process.env.MYSQL_URL         ? "MYSQL_URL"
            : process.env.MYSQL_PRIVATE_URL ? "MYSQL_PRIVATE_URL"
            : `${MYSQL_HOST}:${MYSQL_PORT}`;
  console.log(`MySQL: connecting via ${via}`);
} else {
  console.warn("MySQL not configured — state sync disabled. Attach Railway's MySQL plugin to enable cross-device sync.");
}

async function getPool() {
  if (!MYSQL_CONFIGURED) return null;
  if (pool) return pool;

  // Build connection config — prefer URL string, fall back to individual vars.
  const candidate = MYSQL_URL
    ? mysql.createPool(MYSQL_URL)
    : mysql.createPool({
        host:     MYSQL_HOST,
        port:     MYSQL_PORT,
        user:     MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DATABASE,
        ssl:      { rejectUnauthorized: false }, // required for Railway MySQL TLS
        waitForConnections: true,
        connectionLimit: 10,
      });

  // Create the table on first connection — no manual migration step needed.
  // Assign to `pool` only AFTER the table is confirmed — if this throws,
  // `pool` stays null so the next request retries instead of reusing a
  // broken pool (the "self-poisoning" bug).
  await candidate.execute(`
    CREATE TABLE IF NOT EXISTS user_states (
      user_key   VARCHAR(40)  NOT NULL PRIMARY KEY,
      state_json LONGTEXT     NOT NULL,
      updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  pool = candidate;
  return pool;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Only allow the known storage key names (letters + underscores, max 40 chars). */
const validKey = (k) => typeof k === "string" && /^[a-z_]{1,40}$/.test(k);

/** Check X-API-Secret header before every /api/* request. */
function auth(req, res, next) {
  if (!API_SECRET)
    return res.status(503).json({ error: "Server not configured — set API_SECRET" });
  if ((req.headers["x-api-secret"] ?? "") !== API_SECRET)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ── GET /api/state?key=<key> ─────────────────────────────────────────────────
app.get("/api/state", auth, async (req, res) => {
  const key = req.query.key ?? "";
  if (!validKey(key)) return res.status(400).json({ error: "Invalid key" });

  try {
    const db = await getPool();
    if (!db) return res.json({ state: null, updatedAt: null }); // MySQL not configured

    const [rows] = await db.execute(
      "SELECT state_json, updated_at FROM user_states WHERE user_key = ? LIMIT 1",
      [key],
    );
    if (!rows.length) return res.json({ state: null, updatedAt: null });
    res.json({
      state: JSON.parse(rows[0].state_json),
      updatedAt: rows[0].updated_at,
    });
  } catch (err) {
    console.error("GET /api/state:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ── POST /api/state ──────────────────────────────────────────────────────────
app.post("/api/state", auth, async (req, res) => {
  const { key, state } = req.body ?? {};

  if (!validKey(key) || state == null || typeof state !== "object")
    return res.status(400).json({ error: "Invalid request body" });

  const json = JSON.stringify(state);
  if (json.length > 4 * 1024 * 1024)
    return res.status(413).json({ error: "State payload too large (max 4 MB)" });

  try {
    const db = await getPool();
    if (!db) return res.json({ ok: true }); // MySQL not configured — no-op, localStorage is source of truth

    await db.execute(
      `INSERT INTO user_states (user_key, state_json)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = NOW()`,
      [key, json],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/state:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ── DELETE /api/state?key=<key> ──────────────────────────────────────────────
app.delete("/api/state", auth, async (req, res) => {
  const key = req.query.key ?? "";
  if (!validKey(key)) return res.status(400).json({ error: "Invalid key" });

  try {
    const db = await getPool();
    if (!db) return res.json({ ok: true }); // MySQL not configured — no-op

    await db.execute("DELETE FROM user_states WHERE user_key = ?", [key]);
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/state:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// ── SPA catch-all (React Router handles client-side routes) ──────────────────
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => console.log(`Vaulta listening on port ${PORT}`));
