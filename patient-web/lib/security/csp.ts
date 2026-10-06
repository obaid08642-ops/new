/**
 * F68 (owner, 2026-10-06): one Content-Security-Policy for every page, with two ways of delivering the nonce.
 *
 * - Signed-in, checkout, payment, account pages, and ANY request that carries a session cookie: the proxy makes a
 *   fresh nonce per request, Next stamps it on its scripts while it renders, and the page is `no-store`.
 * - Public pages without a session cookie (home, categories, product, doctor, articles…), when the server runs
 *   behind `server/nonce-server.mjs` (`NABD_CSP_EDGE_NONCE=1`): the page is rendered WITHOUT a nonce, so Next can
 *   render it once and cache it (static/ISR). The proxy answers with this same policy holding a fixed placeholder,
 *   and the nonce server replaces the placeholder with a fresh random nonce on every response and stamps that
 *   nonce on every <script>/<style> tag of the HTML. The browser therefore always sees a per-response nonce with
 *   'strict-dynamic' and no 'unsafe-inline': the policy is exactly as strict as on private pages.
 *
 *   A hash-based policy was tried first and does not work with the App Router: each page carries ~9 inline
 *   scripts (the RSC payload `self.__next_f.push(…)`) whose content changes with every page and every revalidation,
 *   and SRI covers external chunks only (measured on a production build, 2026-10-06).
 *
 * Safety of stamping every tag: React escapes text, the RSC payload escapes "<" (<), and the only raw HTML
 * the app renders is the theme script and JSON-LD (escaped). A test pins that list (tests/csp-raw-html.test.ts).
 */

export const CSP_NONCE_PLACEHOLDER = "nabdCspNoncePlaceholder0000";
/** Response header the proxy sets on public HTML for the nonce server; the nonce server removes it. */
export const CSP_INJECT_HEADER = "x-nabd-csp-inject";
export const SESSION_COOKIES = ["nabd_access", "nabd_refresh"] as const;

export function contentSecurityPolicy(nonce: string, isDevelopment = process.env.NODE_ENV === "development") {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https:",
    `style-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-inline'" : ""}`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "connect-src 'self' https://api.nabd.plus wss://live.nabd.plus https://cdn.nabd.plus",
    "font-src 'self' data:",
    "media-src 'self' https:",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function hasSessionCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((part) => {
    const [name, ...rest] = part.trim().split("=");
    return (SESSION_COOKIES as readonly string[]).includes(name) && rest.join("=").trim().length > 0;
  });
}

/** True when the server runs behind the nonce server (set by server/nonce-server.mjs, never in dev or tests by default). */
export function edgeNonceEnabled() {
  return process.env.NABD_CSP_EDGE_NONCE === "1";
}
