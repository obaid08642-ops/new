import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * This is an early session-presence gate only. Authoritative authentication and
 * permissions are always checked by the BFF and NestJS on every API request.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get('admin_access')?.value);
  if (hasSession) return NextResponse.next();

  const login = new URL('/login', request.url);
  login.searchParams.set('returnTo', request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/admin/:path*'],
};
