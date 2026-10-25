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
 *   Owner decision 2026-10-16 (never a shared nonce): the copy of a public page a shared cache keeps (a guest's GET, see
 *   guestCopyIsShared in server/nonce-server.mjs) therefore carries NO nonce: the nonce server computes the sha256 of each
 *   inline script from the exact bytes of that copy (not at build time, for the reason above) and sends script-src with those
 *   hashes + 'strict-dynamic', with each external script behind an inline loader in its own place, all with the same text and so one hash (server/nonce-transform.mjs, hashedPage).
 *
 * Safety of stamping every tag: React escapes text, the RSC payload escapes "<" (<), and the only raw HTML
 * the app renders is the theme script and JSON-LD (escaped). A test pins that list (tests/csp-raw-html.test.ts).
 */

import { createHash } from "node:crypto";
import { THEME_INIT_SCRIPT } from "../../app/theme";
import { livekitConnectSources } from "../consult/livekit-url";

export const CSP_NONCE_PLACEHOLDER = "nabdCspNoncePlaceholder0000";
/** Response header the proxy sets on public HTML for the nonce server; the nonce server removes it. */
export const CSP_INJECT_HEADER = "x-nabd-csp-inject";
export const SESSION_COOKIES = ["nabd_access", "nabd_refresh"] as const;

/**
 * F82-3: the theme script (app/theme.ts) runs inline before the first paint, in the root layout of every page. A static or
 * cached page cannot carry a per-request nonce for it, so the policy allows it by its hash: exactly these bytes, nothing
 * else (an injected script has other content). The hash is computed from the script itself, so they cannot drift apart.
 */
export const THEME_SCRIPT_HASH = `sha256-${createHash("sha256").update(THEME_INIT_SCRIPT).digest("base64")}`;

/**
 * P20.4: the browser Sentry SDK posts errors to its DSN's ingest origin (https://o….ingest.de.sentry.io); without that
 * origin in connect-src no browser error reaches Sentry. The DSN is inlined at build time (Dockerfile.patient-web).
 */
/**
 * The address map (components-next/account/address-map, MapLibre GL): the style, sprite, glyphs and vector tiles all come
 * from OpenFreeMap, which needs no key. The page fetches the style (connect-src), the tile worker fetches the tiles
 * (connect-src) and draws them in WebGL (images and sprites: img-src already allows https:). MapLibre starts its tile worker from a
 * blob: URL, so worker-src allows blob: and nothing else.
 */
export const MAP_TILE_ORIGIN = "https://tiles.openfreemap.org";

export function sentryIngestOrigin(dsn = process.env.NEXT_PUBLIC_SENTRY_DSN): string | null {
  try {
    return dsn ? new URL(dsn).origin : null;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(nonce: string, isDevelopment = process.env.NODE_ENV === "development") {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https:",
    // issue 777: the map page embeds an OpenStreetMap view (https://www.openstreetmap.org/export/embed.html), whose tiles load from *.tile.openstreetmap.org
    // issue 430: Google sign-in (Google Identity Services) draws its popup and button from accounts.google.com/gsi/
    // Owner decision 2026-10-24: all four providers; Apple, X and Snapchat sign in through popup windows (no frames), Apple's script talks to appleid.apple.com
    "frame-src 'self' https://www.openstreetmap.org https://accounts.google.com/gsi/",
    `style-src 'self' 'nonce-${nonce}' https://accounts.google.com/gsi/style${isDevelopment ? " 'unsafe-inline'" : ""}`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' '${THEME_SCRIPT_HASH}'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    // Decision 4 (2026-10-14): a LiveKit other than wss://live.nabd.plus (NABD_LIVEKIT_URL, e.g. the local one of
    // tools/live/start-livekit.sh) is allowed by its exact origin, read at request time like the call screens read it.
    [`connect-src 'self' https://api.nabd.plus wss://live.nabd.plus https://cdn.nabd.plus ${MAP_TILE_ORIGIN} https://accounts.google.com/gsi/ https://appleid.apple.com`, ...livekitConnectSources(), sentryIngestOrigin()].filter(Boolean).join(" "),
    "worker-src 'self' blob:",
    "font-src 'self' data:",
    // voice notes: the recorder previews the patient's own recording from a blob: URL
    "media-src 'self' blob: https:",
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
