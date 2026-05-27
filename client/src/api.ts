// Single place that talks to the API. Everything routes through apiFetch/apiPost
// so that when Clerk lands we swap the X-User-Id header for a real Authorization
// token in exactly one spot.

// Paths are relative (e.g. "/api/..."): the Vite dev server proxies /api/* to
// the Express API, so requests are same-origin from the browser's perspective.

// PLACEHOLDER AUTH — temporary. Sent on every request until Clerk replaces it.
const PLACEHOLDER_USER_ID = 'seed_user_1';

// Surface the server's error message when it sends one; otherwise fall back to
// a status-based message.
async function errorMessage(res: Response): Promise<string> {
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
  return message;
}

/** GET `path` and parse the JSON body as `T`. Throws on a non-2xx response. */
export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: { 'X-User-Id': PLACEHOLDER_USER_ID },
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json() as Promise<T>;
}

/** POST `body` as JSON to `path` and parse the JSON response as `T`. Throws on a non-2xx response. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': PLACEHOLDER_USER_ID,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return res.json() as Promise<T>;
}
