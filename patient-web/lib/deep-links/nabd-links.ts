/**
 * 13.R18 — nabd:// fallback + deferred deep links (patient-web only, client-safe).
 *
 * Mapping (verified 2026-10-04, static):
 * - Universal-link config: app/.well-known/apple-app-site-association/route.ts
 *   (entityPaths) + app/.well-known/assetlinks.json/route.ts (Android).
 * - Native intent filters / nabd:// scheme handlers live in patient-app (native,
 *   out of scope — devices needed for live proof).
 * - Only web consumer of admin-curated `deep_link` values:
 *   lib/api/public-config-server.ts (type) + app/[locale]/page.tsx (href).
 * - No nabd:// parsing, no https fallback, and no deferred-link storage existed
 *   anywhere in patient-web before this file.
 *
 * What this module provides (no backend, no auth-flow changes, no native code):
 * 1. nabd:// → https fallback table/mechanism so a tap on a nabd:// link with
 *    the app NOT installed still lands on a safe browser URL.
 * 2. Deferred deep-link persistence (sessionStorage, tab-scoped, path-only):
 *    stash a pending link pre-login, resolve it post-login from client code.
 *
 * NOTE: opening the native app from a nabd:// URL (intent filter / AASA match)
 * and end-to-end deferred-link behaviour can only be proven on real devices
 * (13.R18 code part only — live proof needs Android + iOS hardware).
 */

/** Custom app scheme handled by the native patient app (intent filter, native). */
export const NABD_APP_SCHEME = "nabd";

/** sessionStorage key for the pending (deferred) deep link. Tab-scoped on purpose. */
export const NABD_DEFERRED_KEY = "nabd.pendingDeepLink.v1";

/** Locales served by patient-web (must match AASA localized paths). */
const NABD_LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"] as const;

/**
 * Fallback table: allowed nabd:// hosts (first segment) → web route prefix.
 * Mirrors the universal-link entityPaths in
 * app/.well-known/apple-app-site-association/route.ts. Anything not listed
 * here is NOT deep-linkable and falls back to the locale home page.
 */
const NABD_FALLBACK_TABLE: Readonly<Record<string, string>> = {
  p: "/p",
  medicine: "/medicine",
  doctor: "/doctor",
  condition: "/condition",
  facility: "/facility",
  doctors: "/doctors",
  "home-nursing": "/home-nursing",
  s: "/s",
  pharmacy: "/pharmacy",
  pharmacies: "/pharmacies",
  consultations: "/consultations",
  labs: "/labs",
  radiology: "/radiology",
  nursing: "/nursing",
  c: "/c",
  articles: "/articles",
  services: "/services",
};

/** Web-only / sensitive prefixes never produced as a fallback target. */
const NABD_EXCLUDED_PREFIXES = ["/api/", "/.well-known/", "/admin/"];

/** Query params never carried into a fallback/deferred URL (secret-bearing). */
const NABD_SENSITIVE_PARAMS = new Set([
  "token",
  "access_token",
  "refresh_token",
  "exchangeToken",
  "code",
  "otp",
  "password",
  "signature",
]);

function isLocale(value: string | null | undefined): value is (typeof NABD_LOCALES)[number] {
  return !!value && (NABD_LOCALES as readonly string[]).includes(value);
}

/** Relative, same-origin, non-excluded path (the only shape we ever resolve to). */
export function isSafeRelativePath(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
  const lower = path.toLowerCase();
  if (NABD_EXCLUDED_PREFIXES.some((p) => lower === p.slice(0, -1) || lower.startsWith(p))) return false;
  return true;
}

function scrubSearch(raw: string): string {
  const params = new URLSearchParams(raw);
  for (const key of [...params.keys()]) {
    if (NABD_SENSITIVE_PARAMS.has(key.toLowerCase())) params.delete(key);
  }
  const out = params.toString();
  return out ? `?${out}` : "";
}

/**
 * Map a nabd:// URL to its safe relative web path (locale preserved when the
 * link carries one, e.g. nabd://doctor/en/123 → /en/doctor/123).
 * Returns null when the link is not an allowlisted deep link.
 */
export function nabdUrlToWebPath(nabdHref: string | null | undefined): string | null {
  if (!nabdHref) return null;
  const trimmed = nabdHref.trim();
  if (!trimmed.toLowerCase().startsWith(`${NABD_APP_SCHEME}://`)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const prefix = NABD_FALLBACK_TABLE[host];
  if (!prefix) return null;
  // nabd://<host>/<maybe-locale>/<rest...> — tolerate both with/without locale.
  const segments = url.pathname.split("/").filter(Boolean);
  const [maybeLocale, ...rest] = segments;
  const locale = isLocale(maybeLocale) ? maybeLocale : null;
  const tail = (locale ? rest : segments).map((s) => encodeURIComponent(decodeURIComponent(s))).join("/");
  const path = tail ? `${prefix}/${tail}` : prefix;
  const withLocale = locale ? `/${locale}${path}` : path;
  const full = `${withLocale}${scrubSearch(url.search)}`;
  return isSafeRelativePath(withLocale) ? full : null;
}

/**
 * Absolute https browser fallback for a nabd:// URL (used when the app isn't
 * installed). Unknown / non-allowlisted links fall back to the locale home.
 */
export function toHttpsFallback(
  nabdHref: string | null | undefined,
  origin: string,
  defaultLocale = "ar",
): string {
  const locale = isLocale(defaultLocale) ? defaultLocale : "ar";
  const cleanOrigin = origin.replace(/\/+$/, "") || "https://nabd.plus";
  const webPath = nabdUrlToWebPath(nabdHref);
  if (webPath) {
    // Re-apply locale when the deep link omitted it.
    const first = webPath.split("/").filter(Boolean)[0];
    const localized = isLocale(first) ? webPath : `/${locale}${webPath}`;
    return `${cleanOrigin}${localized}`;
  }
  return `${cleanOrigin}/${locale}`;
}

/**
 * Normalize any admin-curated `deep_link` value (see public-config-server.ts)
 * into a browser-safe href: nabd:// links become their https fallback,
 * safe relative paths pass through, everything else becomes locale home.
 * Pure — safe to call during render.
 */
export function normalizeDeepLink(
  href: string | null | undefined,
  origin: string,
  locale = "ar",
): string {
  const safeLocale = isLocale(locale) ? locale : "ar";
  if (!href) return `/${safeLocale}`;
  if (href.trim().toLowerCase().startsWith(`${NABD_APP_SCHEME}://`)) {
    return toHttpsFallback(href, origin, safeLocale);
  }
  if (isSafeRelativePath(href.trim())) return href.trim();
  // Absolute https links are only honoured on our own origin.
  try {
    const url = new URL(href.trim());
    const home = new URL(origin);
    if (url.origin === home.origin && isSafeRelativePath(url.pathname)) {
      return `${url.pathname}${scrubSearch(url.search)}`;
    }
  } catch {
    /* fall through to home */
  }
  return `/${safeLocale}`;
}

/**
 * Best-effort attempt to open the native app, falling back to the https URL
 * when the app isn't installed. Client-only; no-op during SSR.
 * Live behaviour provable on devices only.
 */
export function openNabdLink(href: string, origin: string, locale = "ar", timeoutMs = 1200): void {
  if (typeof window === "undefined") return;
  const fallback = normalizeDeepLink(href, origin, locale);
  const isNabd = href.trim().toLowerCase().startsWith(`${NABD_APP_SCHEME}://`);
  if (!isNabd) {
    window.location.href = fallback;
    return;
  }
  const timer = window.setTimeout(() => {
    window.location.href = fallback;
  }, timeoutMs);
  const cancel = () => window.clearTimeout(timer);
  window.addEventListener("pagehide", cancel, { once: true });
  window.location.href = href;
}

// ---------------------------------------------------------------------------
// Deferred deep links (client-side only, no backend).
// Flow: stash pre-login (e.g. gated page) → resolve post-login from client
// code WITHOUT touching auth flows: call resolveDeferredDeepLink() after the
// app confirms a session and navigate to the returned path when non-null.
// ---------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Persist a pending link for post-login resolution. Stores path-only, validated. */
export function savePendingDeepLink(path: string | null | undefined): void {
  const store = storage();
  if (!store || !path) return;
  let candidate = path.trim();
  // Accept nabd:// too — persist its web-path form.
  if (candidate.toLowerCase().startsWith(`${NABD_APP_SCHEME}://`)) {
    const mapped = nabdUrlToWebPath(candidate);
    if (!mapped) return;
    candidate = mapped;
  }
  // Accept absolute same-origin URLs by reducing them to path + scrubbed query.
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      candidate = `${url.pathname}${scrubSearch(url.search)}`;
    } catch {
      return;
    }
  }
  // Scrub sensitive params from query string for any path with query.
  if (candidate.includes("?")) {
    const [pathPart, queryPart] = candidate.split("?", 2);
    candidate = `${pathPart}${scrubSearch(queryPart)}`;
  }
  if (!isSafeRelativePath(candidate.split("?")[0])) return;
  try {
    store.setItem(NABD_DEFERRED_KEY, candidate);
  } catch {
    /* storage unavailable — deferred link is best-effort */
  }
}

/** Peek at the stashed link without consuming it (validated, null when none). */
export function peekPendingDeepLink(): string | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(NABD_DEFERRED_KEY);
    if (!raw || !isSafeRelativePath(raw.split("?")[0])) return null;
    return raw;
  } catch {
    return null;
  }
}

/** Drop the stashed link (e.g. after use, on logout, on locale switch). */
export function clearPendingDeepLink(): void {
  try {
    storage()?.removeItem(NABD_DEFERRED_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Consume the stashed link: returns the validated relative path once, then
 * clears it. Post-login client code navigates to the result when non-null,
 * otherwise continues to its default post-login destination.
 */
export function consumePendingDeepLink(): string | null {
  const pending = peekPendingDeepLink();
  clearPendingDeepLink();
  return pending;
}

/** Capture the current location as the deferred link (call pre-login, client-only). */
export function stashCurrentLocationAsDeferred(): void {
  if (typeof window === "undefined") return;
  const path = `${window.location.pathname}${window.location.search}`;
  if (isSafeRelativePath(window.location.pathname)) savePendingDeepLink(path);
}
