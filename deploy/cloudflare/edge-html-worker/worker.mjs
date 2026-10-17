// P14.9 edge-cached HTML for anonymous visitors (issue #1548). Cloudflare Worker on nabd.plus/* and www.nabd.plus/*.
//
// Why a worker: every page carries a CSP nonce that must be fresh per response (F68), so a shared cache cannot keep
// the HTML as the origin sends it to browsers. The origin has an "edge mode" (patient-web/server/nonce-server.mjs):
// asked with `x-nabd-edge-stamp: <token>`, it answers a public page UNSTAMPED (the placeholder nonce) with Next's
// `s-maxage` + `stale-while-revalidate` + `stale-if-error`. This worker keeps that copy in the Cache API under its own
// key (never in the zone cache, so nobody can be served the placeholder) and stamps a fresh nonce on every response,
// the same way the origin does (stampTags below is the origin's, server/nonce-transform.mjs).
//
// What is never cached here (passed to the origin untouched, which stamps and answers `private`/`no-store`):
// a request with a session cookie or Authorization, anything not GET/HEAD, a page that is not public
// (patient-web/lib/seo/public-indexable.ts), RSC/prefetch requests, and any answer that is not a 200 with s-maxage.
// Outage: a stored copy is served for as long as the origin's stale-if-error allows (no cap, owner decision 2026-10-06);
// with no copy, the origin's own translated "unavailable" page (kept here from earlier) is sent as 503 + Retry-After.
//
// Response header `x-nabd-edge`: HIT | STALE | MISS | REVALIDATED | ERROR-STALE | UNAVAILABLE | BYPASS (for the 14.9
// verify: HIT ratio on anonymous home/product/doctor pages, pages still served with the origin stopped).

export const CSP_NONCE_PLACEHOLDER = "nabdCspNoncePlaceholder0000";
export const EDGE_STAMP_HEADER = "x-nabd-edge-stamp";
const SESSION_COOKIES = ["nabd_access", "nabd_refresh", "admin_access"];
const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"];
const LOCALE = "(?:ar|en|ur|hi|bn|fil)";
// Same list as patient-web/lib/seo/public-indexable.ts (a test keeps them equal).
export const PUBLIC_INDEXABLE = new RegExp(`^\\/${LOCALE}(?:\\/(?:articles(?:\\/[^/]+)?|p\\/[^/]+|c(?:\\/.*)?|medicine-catalog|consultations\\/doctors(?:\\/[^/]+)?|consultations\\/specialties|diagnostics\\/labs(?:\\/[^/]+)?|diagnostics\\/radiology(?:\\/[^/]+)?|diagnostics\\/packages(?:\\/[^/]+)?|nursing\\/catalog|home-care\\/services\\/[^/]+|map|doctor\\/[^/]+(?:\\/[^/]+)?|facility\\/[^/]+|pharmacy\\/(?!(?:barcode|broadcast-status|chat|custom-item|drug-not-found|filters|final-quote|insurance-decision|interactions|manual-order|order-confirm|payment|reorder|request|rx-order|scan-prescription|waiting-for-pharmacy)(?:\\/|$))[^/]+|condition\\/[^/]+|pharmacies(?:\\/[^/]+)?|labs(?:\\/[^/]+(?:\\/[^/]+)?)?|radiology(?:\\/[^/]+(?:\\/[^/]+)?)?|services(?:\\/[^/]+(?:\\/[^/]+)?)?|doctors\\/[^/]+(?:\\/[^/]+(?:\\/[^/]+)?)?|home-nursing(?:\\/[^/]+)?|features\\/[^/]+))?\\/?$`);
// Query parameters that never change the page: left out of the cache key (the origin still gets them).
const TRACKING = /^(utm_[a-z]+|fbclid|gclid|gbraid|wbraid|msclkid|yclid|_ga|mc_cid|mc_eid|ref)$/i;
const KEY_PREFIX = "/__edge_html";
const RETRY_AFTER = "30";

// ---------------------------------------------------------------- the origin's stamping (server/nonce-transform.mjs)
const OPEN_TAG = /<(script|style)(?=[\s>/])([^>]*)>/gi;
const SCRIPT_PRELOAD = /<link(?=[\s/>])([^>]*\sas\s*=\s*["']?script[^>]*)>/gi;

export function freshNonce() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function stampTags(html, nonce) {
  return html
    .split(CSP_NONCE_PLACEHOLDER).join(nonce)
    .replace(OPEN_TAG, (tag, name, attrs) => (/\snonce\s*=/i.test(attrs) ? tag : `<${name} nonce="${nonce}"${attrs}>`))
    .replace(SCRIPT_PRELOAD, (tag, attrs) => (/\snonce\s*=/i.test(attrs) ? tag : `<link nonce="${nonce}"${attrs}>`));
}

// ---------------------------------------------------------------- what may be cached
export function hasSession(request) {
  if ((request.headers.get("authorization") || "").trim()) return true;
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").some((part) => {
    const [name, ...rest] = part.trim().split("=");
    return SESSION_COOKIES.includes(name) && rest.join("=").trim().length > 0;
  });
}

/** A document request for a public page by a visitor with no session: the only kind this worker caches. */
export function cacheable(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const url = new URL(request.url);
  if (url.pathname.startsWith(KEY_PREFIX)) return false;
  if (!PUBLIC_INDEXABLE.test(url.pathname)) return false;
  if (url.searchParams.has("_rsc") || request.headers.get("rsc") || request.headers.get("next-router-prefetch")) return false;
  if (hasSession(request)) return false;
  return true;
}

export function cacheKey(requestUrl) {
  const url = new URL(requestUrl);
  const kept = [...url.searchParams].filter(([k]) => !TRACKING.test(k)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const q = new URLSearchParams(kept).toString();
  return `https://${url.host}${KEY_PREFIX}${url.pathname}${q ? `?${q}` : ""}`;
}

/** s-maxage / stale-while-revalidate / stale-if-error in seconds, or null when the answer may not be shared. */
export function edgePolicy(cacheControl) {
  const cc = String(cacheControl || "").toLowerCase();
  if (/\b(private|no-store|no-cache)\b/.test(cc)) return null;
  const n = (name) => {
    const m = new RegExp(`(?:^|[,\\s])${name}=(\\d+)`).exec(cc);
    return m ? Number(m[1]) : null;
  };
  const sMaxAge = n("s-maxage");
  if (sMaxAge === null) return null;
  return { sMaxAge, swr: n("stale-while-revalidate") ?? 0, sie: n("stale-if-error") ?? 0 };
}

function localeOf(pathname) {
  const first = pathname.split("/")[1];
  return LOCALES.includes(first) ? first : "ar";
}

// ---------------------------------------------------------------- responses
const STORED_AT = "x-nabd-edge-stored-at";
const POLICY = "x-nabd-edge-policy";

/** What goes in the Cache API: the unstamped HTML and the headers a browser should get (never Set-Cookie or Vary). */
function toStore(origin, body, policy) {
  const headers = new Headers(origin.headers);
  for (const h of ["set-cookie", "vary", "content-length", "content-encoding", "etag", "age", "cf-cache-status", "cf-ray"]) headers.delete(h);
  headers.set(STORED_AT, String(Date.now()));
  headers.set(POLICY, JSON.stringify(policy));
  // the Cache API keeps it for as long as it may be served stale after an error
  headers.set("cache-control", `public, max-age=${policy.sMaxAge + Math.max(policy.swr, policy.sie)}`);
  return new Response(body, { status: 200, headers });
}

/** A stored or fresh unstamped page, sent with a fresh nonce; shared caches downstream must not keep it. */
async function stamped(stored, label, request, { status = 200, extra = {} } = {}) {
  const nonce = freshNonce();
  const headers = new Headers(stored.headers);
  const policy = JSON.parse(headers.get(POLICY) || "null");
  headers.delete(STORED_AT);
  headers.delete(POLICY);
  headers.set("content-security-policy", String(headers.get("content-security-policy") || "").split(CSP_NONCE_PLACEHOLDER).join(nonce));
  // the browser may not reuse it (it holds this response's nonce); the edge keeps the unstamped copy itself
  headers.set("cache-control", "private, no-cache");
  if (policy) headers.set("x-nabd-edge-policy", `s-maxage=${policy.sMaxAge}, swr=${policy.swr}`);
  headers.set("x-nabd-edge", label);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  const body = request.method === "HEAD" ? null : stampTags(await stored.text(), nonce);
  return new Response(body, { status, headers });
}

function bypass(response, label) {
  const r = new Response(response.body, response);
  r.headers.set("x-nabd-edge", label);
  return r;
}

// ---------------------------------------------------------------- origin
function originRequest(request, env) {
  const headers = new Headers(request.headers);
  headers.set(EDGE_STAMP_HEADER, env.EDGE_STAMP_TOKEN);
  headers.delete("cookie"); // the page is the same for every guest; the origin must not vary it on a cookie
  return new Request(request.url, { method: "GET", headers, redirect: "manual" });
}

/** Fetches the page in edge mode; stores it when the origin says it may be shared. Returns { response, stored }. */
async function fetchAndStore(request, env, ctx, cache, key) {
  const origin = await fetch(originRequest(request, env));
  const policy = origin.status === 200 ? edgePolicy(origin.headers.get("cache-control")) : null;
  const unstamped = String(origin.headers.get("content-security-policy") || "").includes(CSP_NONCE_PLACEHOLDER);
  if (!policy || !unstamped) return { response: origin, stored: null };
  const body = await origin.text();
  const stored = toStore(origin, body, policy);
  ctx.waitUntil(cache.put(key, stored.clone()));
  return { response: origin, stored };
}

const refreshing = new Set();

// ---------------------------------------------------------------- the translated "unavailable" page, kept for outages
function unavailableKey(host, locale) {
  return `https://${host}${KEY_PREFIX}/__unavailable/${locale}`;
}

/** Keeps the origin's unavailable page per locale, with its nonce replaced by the placeholder (re-stamped on use). */
async function keepUnavailablePage(host, locale, env, cache) {
  const key = unavailableKey(host, locale);
  if (await cache.match(key)) return;
  const res = await fetch(new Request(`https://${host}/${locale}/unavailable`, { headers: { accept: "text/html" } }));
  // only the real page: a 200 the origin marks noindex (app/[locale]/unavailable), never something a redirect led to
  if (res.status !== 200 || !/noindex/i.test(res.headers.get("x-robots-tag") || "")) return;
  const csp = res.headers.get("content-security-policy") || "";
  const m = /'nonce-([^']+)'/.exec(csp);
  const html = await res.text();
  const body = m ? html.split(m[1]).join(CSP_NONCE_PLACEHOLDER) : html;
  const headers = new Headers({ "content-type": res.headers.get("content-type") || "text/html; charset=utf-8", "content-security-policy": m ? csp.split(m[1]).join(CSP_NONCE_PLACEHOLDER) : csp, "x-robots-tag": "noindex, nofollow, noarchive", "cache-control": "public, max-age=31536000" });
  await cache.put(key, new Response(body, { status: 200, headers }));
}

async function unavailable(request, cache) {
  const url = new URL(request.url);
  const kept = await cache.match(unavailableKey(url.host, localeOf(url.pathname)));
  if (kept) return stamped(kept, "UNAVAILABLE", request, { status: 503, extra: { "retry-after": RETRY_AFTER, "cache-control": "no-store" } });
  return new Response("Service temporarily unavailable / الخدمة غير متاحة مؤقتاً", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "retry-after": RETRY_AFTER, "x-nabd-edge": "UNAVAILABLE" } });
}

// ---------------------------------------------------------------- the handler
export async function handle(request, env, ctx, cache) {
  if (!env.EDGE_STAMP_TOKEN || !cacheable(request)) {
    return bypass(await fetch(request), "BYPASS");
  }
  const url = new URL(request.url);
  const key = cacheKey(request.url);
  const stored = await cache.match(key);
  const age = stored ? (Date.now() - Number(stored.headers.get(STORED_AT) || 0)) / 1000 : Infinity;
  const policy = stored ? JSON.parse(stored.headers.get(POLICY) || "null") : null;

  if (stored && policy && age <= policy.sMaxAge) return stamped(stored, "HIT", request);
  if (stored && policy && age <= policy.sMaxAge + policy.swr) {
    if (!refreshing.has(key)) {
      refreshing.add(key);
      ctx.waitUntil(fetchAndStore(request, env, ctx, cache, key).catch(() => null).finally(() => refreshing.delete(key)));
    }
    return stamped(stored, "STALE", request);
  }

  let result;
  try {
    result = await fetchAndStore(request, env, ctx, cache, key);
  } catch {
    result = null;
  }
  const failed = !result || result.response.status >= 500;
  if (failed && stored && policy && age <= policy.sMaxAge + Math.max(policy.swr, policy.sie)) {
    return stamped(stored, "ERROR-STALE", request);
  }
  if (!result) return unavailable(request, cache);
  if (result.stored) {
    ctx.waitUntil(keepUnavailablePage(url.host, localeOf(url.pathname), env, cache).catch(() => null));
    return stamped(result.stored, stored ? "REVALIDATED" : "MISS", request);
  }
  // not shareable (error page, redirect, a page the origin answers privately): as the origin sent it
  return bypass(result.response, "BYPASS");
}

export default {
  async fetch(request, env, ctx) {
    return handle(request, env, ctx, caches.default);
  },
};
