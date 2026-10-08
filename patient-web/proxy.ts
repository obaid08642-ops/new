import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { contentSecurityPolicy, CSP_INJECT_HEADER, CSP_NONCE_PLACEHOLDER, edgeNonceEnabled, hasSessionCookie } from "./lib/security/csp";

const handleI18nRouting = createMiddleware(routing);
const noIndexHeader = "noindex, nofollow, noarchive";

function isPublicLocaleHome(pathname: string) {
  return routing.locales.some((locale) => pathname === `/${locale}` || pathname === `/${locale}/`);
}

// Indexable public surfaces: locale homes, articles, the v14 product pages
// /{lang}/p/{slug}, category clusters /{lang}/c…, catalogue landing, plus the
// public SEO detail surfaces that already emit index:true metadata
// (doctor/facility/condition/pharmacies/labs/radiology/services/doctors-specialty).
const LOCALE = "(?:ar|en|ur|hi|bn|fil)";
const PUBLIC_INDEXABLE = new RegExp(`^\\/${LOCALE}(?:\\/(?:articles(?:\\/[^/]+)?|p\\/[^/]+|c(?:\\/.*)?|medicine-catalog|consultations\\/doctors(?:\\/[^/]+)?|diagnostics\\/labs(?:\\/[^/]+)?|diagnostics\\/radiology(?:\\/[^/]+)?|nursing\\/catalog|map|doctor\\/[^/]+|facility\\/[^/]+|condition\\/[^/]+|pharmacies(?:\\/[^/]+)?|labs(?:\\/[^/]+(?:\\/[^/]+)?)?|radiology(?:\\/[^/]+(?:\\/[^/]+)?)?|services(?:\\/[^/]+(?:\\/[^/]+)?)?|doctors\\/[^/]+(?:\\/[^/]+(?:\\/[^/]+)?)?|home-nursing(?:\\/[^/]+)?))?\\/?$`);

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

  // F68: public pages without a session render without a nonce (cacheable); the nonce server stamps a fresh
  // one on every response. Everything else gets a per-request nonce from here and is never stored.
  const publicPage = isPublicIndexable(pathname);
  const withSession = hasSessionCookie(request.headers.get("cookie"));
  if (publicPage && !withSession && edgeNonceEnabled()) {
    const response = handleI18nRouting(request);
    response.headers.set("Content-Security-Policy", contentSecurityPolicy(CSP_NONCE_PLACEHOLDER));
    response.headers.set(CSP_INJECT_HEADER, "1");
    return response;
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const requestWithNonce = new NextRequest(request, { headers: requestHeaders });
  const response = handleI18nRouting(requestWithNonce);
  response.headers.set("Content-Security-Policy", policy);
  // A page that is private, or any page answered to a session, is never cacheable (no shared or stored copy).
  if (!publicPage || withSession) response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
  if (!publicPage) response.headers.set("X-Robots-Tag", noIndexHeader);
  return response;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
