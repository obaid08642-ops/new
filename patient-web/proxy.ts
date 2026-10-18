import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { chooseLocale } from "./lib/i18n/device-locale";
import { isPublicIndexable } from "./lib/seo/public-indexable";
import { contentSecurityPolicy, CSP_INJECT_HEADER, CSP_NONCE_PLACEHOLDER, edgeNonceEnabled, hasSessionCookie } from "./lib/security/csp";

const handleI18nRouting = createMiddleware(routing);
const noIndexHeader = "noindex, nofollow, noarchive";
const NO_STORE = "private, no-cache, no-store, max-age=0, must-revalidate";

const LOCALE = "(?:ar|en|ur|hi|bn|fil)";
const LOCALE_PREFIX = new RegExp(`^\\/${LOCALE}(?:\\/|$)`);
// F82-3: the translated page that answers when a public page failed with no cached copy (app/[locale]/unavailable). It is
// static, so it takes the stamping path like a public page; it is never indexed and never stored.
const UNAVAILABLE_PAGE = new RegExp(`^\\/${LOCALE}\\/unavailable\\/?$`);
// journeys#77: the static offline page the service worker keeps (app/[locale]/offline), stamped like the unavailable page.
const OFFLINE_PAGE = new RegExp(`^\\/${LOCALE}\\/offline\\/?$`);

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

/** The policy with the placeholder nonce, and the mark that tells the nonce server to stamp this response (see lib/security/csp.ts). */
function stampedResponse(response: NextResponse, { noStore, noIndex }: { noStore: boolean; noIndex: boolean }) {
  response.headers.set("Content-Security-Policy", contentSecurityPolicy(CSP_NONCE_PLACEHOLDER));
  response.headers.set(CSP_INJECT_HEADER, "1");
  if (noStore) response.headers.set("Cache-Control", NO_STORE);
  if (noIndex) response.headers.set("X-Robots-Tag", noIndexHeader);
  return response;
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

  // Rule 6: a page path without a locale goes to the language the user chose, else the device's (lib/i18n/device-locale.ts).
  // The answer depends on the device and the cookie, so it is never stored and the cache is told to vary on both.
  if (!LOCALE_PREFIX.test(pathname)) {
    const target = request.nextUrl.clone();
    const locale = chooseLocale(request.cookies.get("NEXT_LOCALE")?.value, request.headers.get("accept-language"));
    target.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    const redirect = NextResponse.redirect(target, 307);
    redirect.headers.set("Cache-Control", NO_STORE);
    redirect.headers.set("Vary", "Accept-Language, Cookie");
    redirect.headers.set("X-Robots-Tag", noIndexHeader);
    return redirect;
  }

  // F68: public pages render without a nonce (cacheable); the nonce server stamps a fresh one on every response.
  // Everything else gets a per-request nonce from here and is never stored.
  //
  // F82-3: a public page is static/ISR, so the HTML a signed-in visitor gets is the same cached HTML as everyone else's and
  // cannot carry a nonce of its own: it takes the stamping path as well (a per-request nonce in the header would match no
  // script of a cached page). What the session changes is only that the answer is never stored: no-store.
  const publicPage = isPublicIndexable(pathname);
  const withSession = hasSessionCookie(request.headers.get("cookie"));
  if (edgeNonceEnabled()) {
    if (publicPage || UNAVAILABLE_PAGE.test(pathname) || OFFLINE_PAGE.test(pathname)) {
      return stampedResponse(handleI18nRouting(request), { noStore: withSession || !publicPage, noIndex: !publicPage });
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // The page a gated route came from, so the sign-in can send the patient back to it (lib/auth/session.ts).
  requestHeaders.set("x-nabd-path", `${pathname}${request.nextUrl.search}`);
  requestHeaders.set("Content-Security-Policy", policy);

  const requestWithNonce = new NextRequest(request, { headers: requestHeaders });
  const response = handleI18nRouting(requestWithNonce);
  response.headers.set("Content-Security-Policy", policy);
  // A page that is private, or any page answered to a session, is never cacheable (no shared or stored copy).
  if (!publicPage || withSession) response.headers.set("Cache-Control", NO_STORE);
  if (!publicPage) response.headers.set("X-Robots-Tag", noIndexHeader);
  return response;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
