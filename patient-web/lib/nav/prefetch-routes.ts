/**
 * Which routes may be prefetched IN FULL (the page's data as well as its shell) ahead of the click (F82-2).
 *
 * Next's default prefetch of a dynamic route stops at its loading boundary, so the click still waits for a server
 * render. A full prefetch renders the page on the server before the click and keeps the result in the client router
 * cache (memory of this tab only; `router.refresh()` on sign-in and sign-out clears it).
 *
 * Only pages whose HTML is the same for every visitor are listed. A page that reads the session cookie for the
 * patient's own data (orders, cart, bookings, profile, dashboard, chat, home-care) is never listed, because a full
 * prefetch would ask the backend for that data on every page view and keep it in the tab. `/diagnostics` is the one
 * mixed case: it lists the patient's bookings when signed in, so it is allowed for signed-out visitors only.
 *
 * A prefetch is a render, never a mutation: every listed page only reads (GET) and has no side effect.
 */
const LOCALE_PREFIX = /^\/(?:ar|en|ur|hi|bn|fil)(?=\/|$)/;

/** Exact paths (after the locale) that are the same for everyone. */
const PUBLIC_EXACT = new Set(["/consultations/doctors", "/c", "/diagnostics/labs", "/nursing/catalog", "/map", "/articles"]);

/** `/p/<slug>`, `/c/<category...>`, `/consultations/doctors/<id>`, `/articles/<slug>`: public detail and list pages. */
const PUBLIC_PATTERNS: RegExp[] = [/^\/c\/[^/]+(?:\/[^/]+)*$/, /^\/p\/[^/]+$/, /^\/consultations\/doctors\/[^/]+$/, /^\/articles\/(?!bookmarks$)[^/]+$/];

/** Public for a visitor without a session, per-user for a signed-in patient. */
const SIGNED_OUT_ONLY = new Set(["/diagnostics"]);

/**
 * True for a route whose full prefetch depends on the session (F82-3: the caller then asks the session identity, in
 * the browser; the static HTML never carries it). Every other route's answer does not depend on `signedIn`.
 */
export function dependsOnSession(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const path = href.split(/[?#]/)[0].replace(LOCALE_PREFIX, "").replace(/(.)\/$/, "$1");
  return SIGNED_OUT_ONLY.has(path);
}

export function isFullPrefetchRoute(href: string, opts: { signedIn?: boolean } = {}): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const path = href.split(/[?#]/)[0].replace(LOCALE_PREFIX, "").replace(/(.)\/$/, "$1");
  // the Saved tab of the articles reads the patient's bookmarks: only the public list (All) is the same for everyone
  if (path === "/articles" && /[?&]tab=saved(?:&|#|$)/.test(href)) return false;
  if (PUBLIC_EXACT.has(path)) return true;
  if (SIGNED_OUT_ONLY.has(path)) return !opts.signedIn;
  return PUBLIC_PATTERNS.some((re) => re.test(path));
}
