// Single place that talks to the API. Everything routes through `apiFetch` so
// that when Clerk lands we swap the X-User-Id header for a real Authorization
// token in exactly one spot.

// Dev: the API runs on its own origin (CORS-enabled for the Vite dev server).
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';

// PLACEHOLDER AUTH — temporary. Sent on every request until Clerk replaces it.
const PLACEHOLDER_USER_ID = 'seed_user_1';

/** GET `path` and parse the JSON body as `T`. Throws on a non-2xx response. */
export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'X-User-Id': PLACEHOLDER_USER_ID },
  });

  if (!res.ok) {
    // Surface the server's error message when it sends one.
    let message = `Request failed (${res.status})`;
    try {
      const body: unknown = await res.json();
      if (
        body &&
        typeof body === 'object' &&
        'error' in body &&
        typeof (body as { error: unknown }).error === 'string'
      ) {
        message = (body as { error: string }).error;
      }
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
