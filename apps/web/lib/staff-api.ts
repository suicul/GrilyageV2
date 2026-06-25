/**
 * Staff API fetch wrapper with CSRF token management.
 *
 * - Automatically attaches X-CSRF-Token header when the csrf-token cookie is present.
 * - Assumes server sets the csrf-token cookie (non-httpOnly) via GET /api/v1/staff/auth/csrf-token.
 */

/**
 * Read a cookie value by name. Works client-side only.
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

/**
 * Fetch wrapper for staff API endpoints.
 * Automatically adds the X-CSRF-Token header for state-changing methods
 * when the csrf-token cookie is available.
 */
export async function staffApiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers ?? {});

  // Attach CSRF token for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCookie('csrf-token');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  return fetch(url, { ...options, headers, credentials: 'include' });
}

/**
 * Fetch the CSRF token from the server (sets the csrf-token cookie on the response).
 * Should be called once on app load.
 */
export async function fetchCsrfToken(): Promise<void> {
  try {
    await fetch('/api/v1/staff/auth/csrf-token', { credentials: 'include' });
  } catch {
    // Silently ignore — CSRF token is optional (Origin check still works)
  }
}
