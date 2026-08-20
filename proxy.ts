import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);
const noIndexHeader = "noindex, nofollow, noarchive";

function isPublicLocaleHome(pathname: string) {
  return routing.locales.some((locale) => pathname === `/${locale}` || pathname === `/${locale}/`);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) return NextResponse.next();
  const response = handleI18nRouting(request);
  if (!isPublicLocaleHome(pathname)) response.headers.set("X-Robots-Tag", noIndexHeader);
  return response;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
