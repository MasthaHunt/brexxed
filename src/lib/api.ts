/**
 * Brex / Vaulta — server state sync + security hold API
 *
 * State functions fail silently — localStorage is always the primary source of
 * truth for user state. The server is a cross-device sync layer.
 * Hold functions return boolean success since they are authoritative (hold
 * state lives in the database, not localStorage).
 */

import type { SecurityHoldRecord } from "@/state/types";

export type { SecurityHoldRecord };

const API_URL   = "/api/state";
const HOLD_URL  = "/api/hold";
const HOLDS_URL = "/api/holds";

/**
 * The shared secret that gates the API.
 * Set VITE_API_SECRET in your .env file before building.
 */
const API_SECRET: string =
  (import.meta.env.VITE_API_SECRET as string | undefined) ?? "";

const headers = (): HeadersInit => ({
  "X-API-Secret": API_SECRET,
});

// ── State sync ────────────────────────────────────────────────────────────────

/** Fetch stored state for a slot key. Returns null if the slot is empty or unreachable. */
export async function fetchStateFromServer(key: string): Promise<unknown | null> {
  if (!API_SECRET) return null;
  try {
    const res = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
      headers: headers(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { state?: unknown };
    return data.state ?? null;
  } catch {
    return null;
  }
}

/** Persist state for a slot key. Fires-and-forgets — errors are swallowed. */
export async function saveStateToServer(key: string, state: unknown): Promise<void> {
  if (!API_SECRET) return;
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ key, state }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // Silent — localStorage copy is safe
  }
}

/** Delete a slot from the server (used by resetDemo). */
export async function deleteStateFromServer(key: string): Promise<void> {
  if (!API_SECRET) return;
  try {
    await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      headers: headers(),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Silent
  }
}

// ── Security Hold API ─────────────────────────────────────────────────────────

/** Fetch all active holds (admin view). Optionally filter by userKey. */
export async function fetchSecurityHolds(userKey?: string): Promise<SecurityHoldRecord[]> {
  if (!API_SECRET) return [];
  try {
    const url = userKey
      ? `${HOLDS_URL}?userKey=${encodeURIComponent(userKey)}`
      : HOLDS_URL;
    const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { holds?: SecurityHoldRecord[] };
    return data.holds ?? [];
  } catch {
    return [];
  }
}

/** Place a compliance hold on an account. Returns true on success. */
export async function placeSecurityHold(
  userKey: string,
  accountId: string,
  reason: string,
): Promise<boolean> {
  if (!API_SECRET) return false;
  try {
    const res = await fetch(HOLD_URL, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ userKey, accountId, reason }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Clear a compliance hold on an account. Only Takeshi is permitted. Returns true on success. */
export async function clearSecurityHold(
  userKey: string,
  accountId: string,
  clearedBy: string,
): Promise<boolean> {
  if (!API_SECRET) return false;
  try {
    const res = await fetch(HOLD_URL, {
      method: "DELETE",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ userKey, accountId, clearedBy }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Update the hold reason/message for an existing hold. */
export async function updateHoldMessage(
  userKey: string,
  accountId: string,
  reason: string,
): Promise<boolean> {
  if (!API_SECRET) return false;
  try {
    const res = await fetch(HOLD_URL, {
      method: "PATCH",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ userKey, accountId, reason }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Delete ALL holds — used by resetDemo. */
export async function clearAllHolds(): Promise<void> {
  if (!API_SECRET) return;
  try {
    await fetch(HOLDS_URL, {
      method: "DELETE",
      headers: headers(),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Silent
  }
}
