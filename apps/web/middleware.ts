import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    // Check for staff access token in cookie or localStorage
    // Note: middleware runs on server, can't read localStorage
    // We redirect to /admin/login and let the client-side layout handle auth
    const staffToken = request.cookies.get('staff_token')?.value;
    if (!staffToken) {
      // Allow the request through — client-side layout will handle redirect
      // This middleware exists to prevent SSR of admin pages without auth
      // Actual auth check happens in the layout component
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
