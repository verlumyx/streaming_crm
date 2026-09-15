import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

/** Must match `advanced.cookiePrefix` in `src/lib/auth.ts`. */
const COOKIE_PREFIX = 'streaming-crm';

const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/two-factor',
  '/verify-email',
  '/contact',
] as const;

/** Public only as an exact match (the landing page). */
const PUBLIC_EXACT_PATHS = ['/'] as const;

function isPublicPath(pathname: string): boolean {
  if ((PUBLIC_EXACT_PATHS as readonly string[]).includes(pathname)) return true;
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Optimistic auth gate: only checks that a session cookie exists (no DB call).
 * Pages still validate the session server-side with `auth.api.getSession`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX }));

  if (isPublicPath(pathname)) {
    if (pathname === '/login' && hasSessionCookie) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except API routes (better-auth and the token-based mobile API authenticate themselves),
  // Next internals and static assets.
  matcher: ['/((?!api/|_next|images|css|assets|favicon\\.ico).*)'],
};
