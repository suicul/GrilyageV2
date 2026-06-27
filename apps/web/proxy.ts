import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Combined middleware for Next.js 16.2.9.
 *
 * 1. Sets Content-Security-Policy with a per-request nonce (P1-1).
 * 2. Handles staff auth for admin routes.
 *
 * Using proxy.ts (not middleware.ts) per Next.js 16 docs.
 */
/**
 * Paths under /admin that should bypass the staff_token check.
 */
const ADMIN_PUBLIC = ['/admin/login', '/admin/_next', '/admin/favicon.ico'];

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const { pathname } = request.nextUrl;

  // Staff auth guard: redirect /admin/* to /admin/login when staff_token is missing.
  if (
    pathname.startsWith('/admin') &&
    !ADMIN_PUBLIC.some((p) => pathname.startsWith(p)) &&
    !request.cookies.has('staff_token')
  ) {
    const login = new URL('/admin/login', request.url);
    login.searchParams.set('redirect', pathname);
    return NextResponse.redirect(login);
  }

  // CSP header with strict-dynamic
  const csp = [
    `default-src 'self'`,
    `script-src 'nonce-${nonce}' 'strict-dynamic' https://unpkg.com`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://images.unsplash.com https://*.unsplash.com https://images.meme-arsenal.com https://yastatic.net https://core-renderer-tiles.maps.yandex.net https://log.api-maps.yandex.ru https://street-view-images.maps.yandex.net https://yandex.ru`,
    `frame-src 'self' https://yandex.com https://yandex.ru`,
    `connect-src 'self' https://o4511609450004480.ingest.de.sentry.io wss://grillyage.ru`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static assets, API rewrites, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|api/v1/).*)',
  ],
};
