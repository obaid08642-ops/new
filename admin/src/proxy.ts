import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * F68: every admin page (sign-in included) gets a fresh nonce CSP per request and is never stored. The session
 * check here is only an early presence gate; authentication and permissions are always checked by the BFF and
 * NestJS on every API request.
 */
export function contentSecurityPolicy(nonce: string, isDev = process.env.NODE_ENV !== 'production') {
  const apiOrigins = (process.env.NEXT_PUBLIC_API_ORIGIN || process.env.ADMIN_BACKEND_URL || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Inline style attributes are still used across the admin screens; a nonce here would disable
    // 'unsafe-inline' for styles, so styles keep it until the screens move to class-only styling.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src 'self'${apiOrigins.map((o) => ` ${o}`).join('')}${isDev ? ' http: https: ws:' : ''}`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

const NO_STORE = 'private, no-cache, no-store, max-age=0, must-revalidate';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = contentSecurityPolicy(nonce);

  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/admin') && !request.cookies.get('admin_access')?.value) {
    const login = new URL('/login', request.url);
    login.searchParams.set('returnTo', pathname);
    const redirect = NextResponse.redirect(login);
    redirect.headers.set('Content-Security-Policy', policy);
    redirect.headers.set('Cache-Control', NO_STORE);
    return redirect;
  }

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', NO_STORE);
  return response;
}

export const config = {
  // Every page, the sign-in page included; not the API, static files or images.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-z0-9]+$).*)'],
};
