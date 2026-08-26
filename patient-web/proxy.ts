import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);
const noIndexHeader = "noindex, nofollow, noarchive";

function isPublicLocaleHome(pathname: string) {
  return routing.locales.some((locale) => pathname === `/${locale}` || pathname === `/${locale}/`);
}

// I: public login-free surfaces that SHOULD be indexable (kept in sync with sitemap).
const INDEXABLE_PUBLIC_PREFIXES = ["/medicine-catalog", "/specialties", "/articles"];

function isIndexablePublic(pathname: string) {
  if (isPublicLocaleHome(pathname)) return true;
  return routing.locales.some((locale) =>
    INDEXABLE_PUBLIC_PREFIXES.some((prefix) => pathname === `/${locale}${prefix}` || pathname.startsWith(`/${locale}${prefix}/`)),
  );
}

function createContentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https:",
    `style-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-inline'" : ""}`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "connect-src 'self' https://api.nabd.plus wss://api.nabd.plus",
    "font-src 'self' data:",
    "media-src 'self' https:",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return NextResponse.next();
  // F-W3: the previous `pathname.includes(".")` shortcut let ANY dotted path skip
  // CSP and X-Robots-Tag entirely. Static assets still bypass via the matcher's
  // `_next` rules and their own extensions, but HTML-ish dotted routes no longer
  // escape the security/noindex headers.
  if (pathname.includes(".") && !pathname.endsWith(".html") && !pathname.endsWith(".htm")) {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const requestWithNonce = new NextRequest(request, { headers: requestHeaders });
  const response = handleI18nRouting(requestWithNonce);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  if (!isIndexablePublic(pathname)) response.headers.set("X-Robots-Tag", noIndexHeader);
  return response;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
