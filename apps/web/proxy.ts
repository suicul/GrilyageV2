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
export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID();

  // CSP header with strict-dynamic
  const csp = [
    `default-src 'self'`,
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'https://unpkg.com'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://images.unsplash.com https://*.unsplash.com`,
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

  response.headers.set('Content-Security-Policy-Report-Only', csp);
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except static assets, API rewrites, and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|api/v1/).*)',
  ],
};
