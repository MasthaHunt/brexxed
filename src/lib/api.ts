/**
 * Brex / Vaulta — server state sync
 *
 * All functions fail silently — localStorage is always the primary source of
 * truth and the server is a cross-device sync layer.  If the server is
 * unreachable the app continues to work exactly as before.
 */

const API_URL = "/api/state";

/**
 * The shared secret that gates the API.
 * Must match API_SECRET in public/api/config.php.
 * Set VITE_API_SECRET in your .env file before building:
 *   echo "VITE_API_SECRET=your-secret-here" >> .env
 */
const API_SECRET: string =
  (import.meta.env.VITE_API_SECRET as string | undefined) ?? "";

const headers = (): HeadersInit => ({
  "X-API-Secret": API_SECRET,
});

/** Fetch stored state for a slot key.  Returns null if the slot is empty or
 *  the server is unavailable. */
export async function fetchStateFromServer(key: string): Promise<unknown | null> {
  if (!API_SECRET) return null; // not configured — skip silently
  try {
    const res = await fetch(`${API_URL}?key=${encodeURIComponent(key)}`, {
      headers: headers(),
      signal: AbortSignal.timeout(8000), // 8 s timeout
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { state?: unknown };
    return data.state ?? null;
  } catch {
    return null;
  }
}

/** Persist state for a slot key.  Fires-and-forgets — errors are swallowed. */
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
