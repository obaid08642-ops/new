// node --test deploy/cloudflare/edge-html-worker/
// The worker with a stand-in origin (fetch) and a stand-in Cache API; time is moved with a fake clock.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handle, cacheable, cacheKey, edgePolicy, stampTags, PUBLIC_INDEXABLE, CSP_NONCE_PLACEHOLDER, EDGE_STAMP_HEADER } from "./worker.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = "edge-token-for-tests";
const env = { EDGE_STAMP_TOKEN: TOKEN };
const P = CSP_NONCE_PLACEHOLDER;
const PAGE = `<!doctype html><html><head><script nonce="${P}" src="/_next/a.js"></script><style>.x{}</style><link rel="preload" as="script" href="/_next/b.js"></head><body><script>self.__next_f.push([1,"${P}"])</script>product</body></html>`;

let now = 1_000_000;
const realNow = Date.now;
Date.now = () => now;
process.on("exit", () => { Date.now = realNow; });

class MemoryCache {
  constructor() { this.map = new Map(); }
  async match(key) { const r = this.map.get(String(key)); return r ? r.clone() : undefined; }
  async put(key, response) { this.map.set(String(key), response.clone()); }
}

let calls, origin, cache, waits;
const ctx = { waitUntil: (p) => waits.push(p) };
const settle = async () => { while (waits.length) await waits.shift(); };

function originAnswer({ status = 200, cc = "s-maxage=60, stale-while-revalidate=300, stale-if-error=31536000", body = PAGE, placeholder = true, cookie = true } = {}) {
  const headers = new Headers({ "content-type": "text/html; charset=utf-8", "cache-control": cc, "content-security-policy": `script-src 'self' 'nonce-${placeholder ? P : "originNonce123"}' 'strict-dynamic'`, vary: "rsc, next-router-state-tree" });
  if (cookie) headers.append("set-cookie", "NEXT_LOCALE=ar; Path=/");
  return new Response(body, { status, headers });
}

beforeEach(() => {
  calls = [];
  waits = [];
  cache = new MemoryCache();
  origin = () => originAnswer();
  globalThis.fetch = async (req) => {
    calls.push({ url: req.url, edge: req.headers.get(EDGE_STAMP_HEADER), cookie: req.headers.get("cookie") });
    return origin(req);
  };
});

const get = (p, headers = {}) => new Request(`https://nabd.plus${p}`, { headers: { accept: "text/html", ...headers } });
const run = async (req) => { const r = await handle(req, env, ctx, cache); await settle(); return r; };
const nonceOf = (res) => /'nonce-([^']+)'/.exec(res.headers.get("content-security-policy") || "")?.[1];

test("the public-page list is the same as patient-web's", () => {
  const src = fs.readFileSync(path.join(HERE, "../../../patient-web/lib/seo/public-indexable.ts"), "utf8");
  const m = /new RegExp\(`(.+)`\);/.exec(src);
  const locale = /const LOCALE = "([^"]+)"/.exec(src);
  assert.ok(m && locale, "regex not found in public-indexable.ts");
  const source = m[1].replace("${LOCALE}", locale[1]).replace(/\\\\/g, "\\");
  assert.equal(PUBLIC_INDEXABLE.source, new RegExp(source).source);
});

test("only guest document requests for public pages are cacheable", () => {
  assert.equal(cacheable(get("/ar/p/panadol")), true);
  assert.equal(cacheable(get("/ar")), true);
  assert.equal(cacheable(get("/en/doctor/dr-x")), true);
  assert.equal(cacheable(get("/ar/cart")), false);
  assert.equal(cacheable(get("/ar/checkout")), false);
  assert.equal(cacheable(get("/ar/login")), false);
  assert.equal(cacheable(get("/ar/pharmacy/payment")), false);
  assert.equal(cacheable(get("/ar/p/panadol", { cookie: "nabd.theme=dark; nabd_access=abc" })), false);
  assert.equal(cacheable(get("/ar/p/panadol", { cookie: "nabd_refresh=x" })), false);
  assert.equal(cacheable(get("/ar/p/panadol", { authorization: "Bearer x" })), false);
  assert.equal(cacheable(get("/ar/p/panadol", { cookie: "nabd_access=" })), true, "an emptied cookie is no session");
  assert.equal(cacheable(get("/ar/p/panadol?_rsc=1")), false);
  assert.equal(cacheable(get("/ar/p/panadol", { rsc: "1" })), false);
  assert.equal(cacheable(new Request("https://nabd.plus/ar/p/panadol", { method: "POST" })), false);
  assert.equal(cacheable(get("/__edge_html/ar/p/panadol")), false);
});

test("the cache key drops tracking parameters and sorts the rest", () => {
  assert.equal(cacheKey("https://nabd.plus/ar/c?q=x&utm_source=a&page=2&fbclid=1"), "https://nabd.plus/__edge_html/ar/c?page=2&q=x");
  assert.equal(cacheKey("https://nabd.plus/ar"), "https://nabd.plus/__edge_html/ar");
});

test("edgePolicy reads the origin's shareable cache headers only", () => {
  assert.deepEqual(edgePolicy("s-maxage=60, stale-while-revalidate=300, stale-if-error=31536000"), { sMaxAge: 60, swr: 300, sie: 31536000 });
  assert.equal(edgePolicy("private, no-cache"), null);
  assert.equal(edgePolicy("public, max-age=60"), null);
  assert.equal(edgePolicy("s-maxage=60, no-store"), null);
});

test("stampTags matches the origin's server/nonce-transform.mjs", async () => {
  const { stampTags: originStamp } = await import("../../../patient-web/server/nonce-transform.mjs");
  assert.equal(stampTags(PAGE, "N1"), originStamp(PAGE, "N1"));
});

test("MISS then HIT: one origin call in edge mode, a fresh nonce per response, no Set-Cookie, never shareable downstream", async () => {
  const a = await run(get("/ar/p/panadol"));
  const b = await run(get("/ar/p/panadol"));
  assert.equal(a.headers.get("x-nabd-edge"), "MISS");
  assert.equal(b.headers.get("x-nabd-edge"), "HIT");
  const pageCalls = calls.filter((c) => c.url.endsWith("/ar/p/panadol"));
  assert.equal(pageCalls.length, 1);
  assert.equal(pageCalls[0].edge, TOKEN);
  for (const r of [a, b]) {
    const html = await r.text();
    const n = nonceOf(r);
    assert.ok(n && n !== P);
    assert.ok(!html.includes(P), "placeholder left in the HTML");
    assert.ok(html.includes(`<script nonce="${n}" src="/_next/a.js">`));
    assert.ok(html.includes(`<style nonce="${n}">`));
    assert.ok(html.includes(`<link nonce="${n}" rel="preload" as="script"`));
    assert.equal(r.headers.get("set-cookie"), null);
    assert.equal(r.headers.get("cache-control"), "private, no-cache");
  }
  assert.notEqual(nonceOf(a), nonceOf(b));
});

test("the guest's cookies never reach the origin on a cached page", async () => {
  await run(get("/ar/p/panadol", { cookie: "nabd.theme=dark; _ga=1" }));
  assert.equal(calls[0].cookie, null);
});

test("signed-in visitors and private pages go to the origin untouched", async () => {
  origin = () => originAnswer({ cc: "private, no-cache, no-store", placeholder: false });
  const s = await run(get("/ar/p/panadol", { cookie: "nabd_access=abc" }));
  assert.equal(s.headers.get("x-nabd-edge"), "BYPASS");
  assert.equal(calls[0].edge, null, "a session request must not carry the edge token");
  const c = await run(get("/ar/cart"));
  assert.equal(c.headers.get("x-nabd-edge"), "BYPASS");
  assert.equal(cache.map.size, 0);
});

test("an origin answer that is not shareable or not unstamped is passed through and not stored", async () => {
  origin = () => originAnswer({ cc: "private, no-cache", placeholder: false });
  const r = await run(get("/ar/p/panadol"));
  assert.equal(r.headers.get("x-nabd-edge"), "BYPASS");
  assert.equal(nonceOf(r), "originNonce123");
  origin = () => originAnswer({ placeholder: false }); // shareable header but stamped: the origin has no edge token
  await run(get("/ar/p/panadol"));
  assert.equal([...cache.map.keys()].filter((k) => k.includes("/p/")).length, 0);
});

test("stale-while-revalidate: a stale copy is served at once and refreshed in the background", async () => {
  await run(get("/ar/p/panadol"));
  now += 120_000; // past s-maxage=60, inside swr=300
  origin = () => originAnswer({ body: PAGE.replace("product", "product v2") });
  const r = await run(get("/ar/p/panadol"));
  assert.equal(r.headers.get("x-nabd-edge"), "STALE");
  assert.ok((await r.text()).includes(">product<"));
  const r2 = await run(get("/ar/p/panadol"));
  assert.equal(r2.headers.get("x-nabd-edge"), "HIT");
  assert.ok((await r2.text()).includes("product v2"));
});

test("origin down: the stored page is served (stale-if-error, no cap); with none, the kept unavailable page as 503", async () => {
  origin = (req) => {
    if (req.url.endsWith("/ar/unavailable")) {
      return new Response(`<html><script nonce="xyz123">1</script>unavailable</html>`, { status: 200, headers: { "content-type": "text/html", "content-security-policy": "script-src 'nonce-xyz123'", "x-robots-tag": "noindex, nofollow, noarchive" } });
    }
    return originAnswer();
  };
  await run(get("/ar/p/panadol")); // a MISS also keeps the unavailable page of its locale
  now += 30 * 86_400_000; // a month later, far past s-maxage + swr
  origin = () => { throw new TypeError("connect ECONNREFUSED"); };
  const stale = await run(get("/ar/p/panadol"));
  assert.equal(stale.headers.get("x-nabd-edge"), "ERROR-STALE");
  assert.equal(stale.status, 200);
  assert.ok((await stale.text()).includes("product"));

  const none = await run(get("/ar/p/never-seen"));
  assert.equal(none.status, 503);
  assert.equal(none.headers.get("x-nabd-edge"), "UNAVAILABLE");
  assert.equal(none.headers.get("retry-after"), "30");
  const html = await none.text();
  const n = nonceOf(none);
  assert.ok(html.includes("unavailable") && html.includes(`nonce="${n}"`) && !html.includes("xyz123"), "the kept page is re-stamped");
});

test("an origin 5xx with no stored copy is passed through (the origin's own unavailable page)", async () => {
  origin = () => new Response("unavailable page", { status: 503, headers: { "retry-after": "30", "cache-control": "no-store" } });
  const r = await run(get("/ar/p/x"));
  assert.equal(r.status, 503);
  assert.equal(r.headers.get("x-nabd-edge"), "BYPASS");
});

test("without the edge token the worker only passes requests through", async () => {
  const r = await handle(get("/ar/p/panadol"), {}, ctx, cache);
  assert.equal(r.headers.get("x-nabd-edge"), "BYPASS");
  assert.equal(calls[0].edge, null);
});
