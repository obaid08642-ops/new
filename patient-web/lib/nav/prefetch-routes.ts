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

export function isFullPrefetchRoute(href: string, opts: { signedIn?: boolean } = {}): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const path = href.split(/[?#]/)[0].replace(LOCALE_PREFIX, "").replace(/(.)\/$/, "$1");
  // the Saved tab of the articles reads the patient's bookmarks: only the public list (All) is the same for everyone
  if (path === "/articles" && /[?&]tab=saved(?:&|#|$)/.test(href)) return false;
  if (PUBLIC_EXACT.has(path)) return true;
  if (SIGNED_OUT_ONLY.has(path)) return !opts.signedIn;
  return PUBLIC_PATTERNS.some((re) => re.test(path));
}

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/** Ambient (not user-initiated) prefetching stays off for Save-Data and 2G connections. Hover and touch still prefetch. */
export function ambientPrefetchAllowed(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (connection?.saveData) return false;
  return connection?.effectiveType !== "slow-2g" && connection?.effectiveType !== "2g";
}

/**
 * Runs `callback` once the page has loaded, `delayMs` later, and the main thread is idle; returns the cancel function.
 * The delay keeps the ambient prefetch out of the first seconds of a visit, when the page's own scripts, styles and
 * font are still on the wire (measured: started right after load it added 45 KB of script and about 135 ms of LCP to
 * the Lighthouse run of `/ar`).
 */
export function onIdle(callback: () => void, { delayMs = 4000, timeoutMs = 3000 }: { delayMs?: number; timeoutMs?: number } = {}): () => void {
  if (typeof window === "undefined") return () => {};
  let cancelled = false;
  let timer: number | undefined;
  let idle: number | undefined;
  const run = () => { if (!cancelled) callback(); };
  const afterDelay = () => {
    if (cancelled) return;
    if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(run, { timeout: timeoutMs });
    else run();
  };
  const start = () => { if (!cancelled) timer = window.setTimeout(afterDelay, delayMs); };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", start);
    if (timer !== undefined) window.clearTimeout(timer);
    if (idle !== undefined && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
  };
}
