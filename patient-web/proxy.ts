import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);
const noIndexHeader = "noindex, nofollow, noarchive";

function isPublicLocaleHome(pathname: string) {
  return routing.locales.some((locale) => pathname === `/${locale}` || pathname === `/${locale}/`);
}

// Indexable public surfaces: locale homes, articles, the v14 product pages
// /{lang}/p/{slug}, category clusters /{lang}/c…, and the catalogue landing.
const LOCALE = "(?:ar|en|ur|hi|bn|fil)";
const PUBLIC_INDEXABLE = new RegExp(`^\\/${LOCALE}(?:\\/(?:articles(?:\\/[^/]+)?|p\\/[^/]+|c(?:\\/.*)?|medicine-catalog|consultations\\/doctors(?:\\/[^/]+)?|diagnostics\\/labs(?:\\/[^/]+)?|diagnostics\\/radiology(?:\\/[^/]+)?|nursing\\/catalog|map))?\\/?$`);

function isPublicIndexable(pathname: string) {
  return isPublicLocaleHome(pathname) || PUBLIC_INDEXABLE.test(pathname);
}

const LEGACY_MEDICINE = new RegExp(`^\\/(${LOCALE})\\/medicines\\/([A-Za-z0-9_-]{1,64})\\/?$`);
const API_BASE = (process.env.NABD_API_BASE_URL || "https://api.nabd.plus/api/v1").replace(/\/$/, "");

/** True 308 for legacy catalogue URLs so engines transfer ranking to /{lang}/p/{slug}. */
async function legacyMedicineRedirect(request: NextRequest): Promise<NextResponse | null> {
  const match = LEGACY_MEDICINE.exec(request.nextUrl.pathname);
  if (!match) return null;
  const [, locale, id] = match;
  try {
    const res = await fetch(`${API_BASE}/public/product-by-id/${locale}/${encodeURIComponent(id)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (typeof data?.slug !== "string" || !data.slug) return null;
    const target = request.nextUrl.clone();
    target.pathname = `/${locale}/p/${encodeURIComponent(data.slug)}`;
    target.search = "";
    return NextResponse.redirect(target, 308);
  } catch {
    return null;
  }
}

function isMarkdownEligible(pathname: string) {
  return routing.locales.some((loc) => pathname === `/${loc}` || pathname === `/${loc}/articles` || pathname === `/${loc}/medicine-catalog` || pathname.startsWith(`/${loc}/p/`)) || pathname === "/";
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
    "connect-src 'self' https://api.nabd.plus",
    "font-src 'self' data:",
    "media-src 'self' https:",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes(".")) return NextResponse.next();

  const legacyRedirect = await legacyMedicineRedirect(request);
  if (legacyRedirect) return legacyRedirect;

  if (request.headers.get("accept")?.toLowerCase().includes("text/markdown") && isMarkdownEligible(pathname)) {
    const markdownUrl = request.nextUrl.clone();
    markdownUrl.pathname = "/api/agent-markdown";
    markdownUrl.search = `?path=${encodeURIComponent(pathname === "/" ? "/" : pathname)}`;
    return NextResponse.rewrite(markdownUrl);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const requestWithNonce = new NextRequest(request, { headers: requestHeaders });
  const response = handleI18nRouting(requestWithNonce);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  if (!isPublicIndexable(pathname)) response.headers.set("X-Robots-Tag", noIndexHeader);
  return response;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
