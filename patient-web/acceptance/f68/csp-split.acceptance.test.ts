// ACCEPTANCE — F68 (owner change, 2026-10-05): split CSP by page kind.
// Written by the reviewer before the fix; the implementing agent makes it pass and
// may not edit it.
//
//  - Public pages (the indexable surfaces: locale home, articles, products,
//    catalogue, doctor/lab/radiology listings…) render without a nonce so Next
//    can cache them; the nonce server stamps a fresh nonce on every response
//    (revised 2026-10-06, see the public-pages block below).
//  - Signed-in, checkout, payment and account pages get a per-request NONCE CSP
//    ('nonce-…' + 'strict-dynamic', a fresh nonce each request) and
//    Cache-Control: no-store.
//  - Any HTML response to a request that carries a session cookie (nabd_access /
//    nabd_refresh) is never cacheable: Cache-Control has no-store — even on a
//    public page.
//  - frame-ancestors 'none' everywhere; HSTS (max-age >= 1 year, includeSubDomains)
//    kept in production.
// Seam under test: `proxy` exported from patient-web/proxy.ts (Next 16 request
// proxy) and the `headers()` of patient-web/next.config.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Same isolation as tests/proxy.test.ts: locale routing is not under test here.
vi.mock("next-intl/middleware", async () => {
  const { NextResponse } = await import("next/server");
  return { default: () => () => NextResponse.next() };
});
vi.mock("../../i18n/routing", () => ({ routing: { locales: ["ar", "en", "ur", "hi", "bn", "fil"], defaultLocale: "ar" } }));

const ORIGIN = "https://www.nabd.plus";
const PUBLIC_PAGES = ["/ar", "/en", "/ar/articles", "/en/p/panadol-500mg", "/ar/medicine-catalog", "/ar/consultations/doctors", "/en/diagnostics/labs"];
const PRIVATE_PAGES = [
  "/ar/dashboard", "/ar/cart/checkout", "/en/cart", "/ar/payments", "/ar/profile", "/en/settings/privacy",
  "/ar/orders", "/ar/appointments", "/ar/notifications", "/ar/prescriptions", "/ar/insurance", "/ar/family",
];

let env: string | undefined;
beforeEach(() => { env = process.env.NODE_ENV; (process.env as Record<string, string>).NODE_ENV = "production"; vi.resetModules(); });
afterEach(() => { (process.env as Record<string, string | undefined>).NODE_ENV = env; });

async function load() {
  const mod = await import("../../proxy");
  return mod.proxy as (r: NextRequest) => Promise<Response> | Response;
}
async function hit(path: string, cookie?: string) {
  const proxy = await load();
  const headers: Record<string, string> = { accept: "text/html" };
  if (cookie) headers.cookie = cookie;
  return proxy(new NextRequest(new URL(path, ORIGIN), { headers }));
}
const csp = (r: Response) => r.headers.get("content-security-policy") || "";
const directive = (policy: string, name: string) => (policy.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) || "");
const cacheControl = (r: Response) => (r.headers.get("cache-control") || "").toLowerCase();

// Revised by the reviewer, 2026-10-06 (owner: "choose the best and do it"): a hash-based policy cannot work with
// the App Router (each page carries ~9 inline RSC-payload scripts that change per page and per revalidation; SRI
// covers external chunks only; measured on a production build). Public pages instead render WITHOUT a nonce (so
// they can be static/ISR) and server/nonce-server.mjs stamps a fresh nonce on every response. The browser-facing
// policy is the same strict one as on private pages: per-response nonce + 'strict-dynamic', no unsafe-inline/eval.
describe("F68: public pages render without a nonce and get a fresh one per response from the nonce server", () => {
  beforeEach(() => { process.env.NABD_CSP_EDGE_NONCE = "1"; });
  afterEach(() => { delete process.env.NABD_CSP_EDGE_NONCE; });

  for (const path of PUBLIC_PAGES) {
    it(`${path}: the proxy marks it for stamping, with the placeholder policy and no no-store`, async () => {
      const { CSP_NONCE_PLACEHOLDER, CSP_INJECT_HEADER } = await import("../../lib/security/csp");
      const r = await hit(path);
      const script = directive(csp(r), "script-src");
      expect(script).toContain(`'nonce-${CSP_NONCE_PLACEHOLDER}'`);
      expect(script).toContain("'strict-dynamic'");
      expect(script).not.toContain("'unsafe-inline'");
      expect(script).not.toContain("'unsafe-eval'");
      expect(directive(csp(r), "frame-ancestors")).toBe("frame-ancestors 'none'");
      expect(r.headers.get(CSP_INJECT_HEADER)).toBe("1");
      expect(cacheControl(r)).not.toContain("no-store");
    });
  }

  it("through the nonce server: a fresh nonce per response, in the header and on every script/style tag; never shared-cacheable", async () => {
    const http = await import("node:http");
    const { handler } = await import("../../server/nonce-server.mjs");
    const { contentSecurityPolicy, CSP_NONCE_PLACEHOLDER, CSP_INJECT_HEADER } = await import("../../lib/security/csp");
    const page = '<html><head><script>self.__next_f=[]</script><style>.a{}</style><script src="/_next/static/a.js" async></script></head><body><p>&lt;script&gt;</p></body></html>';
    const upstream = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-security-policy": contentSecurityPolicy(CSP_NONCE_PLACEHOLDER, false), [CSP_INJECT_HEADER]: "1", "cache-control": "s-maxage=60, stale-while-revalidate" });
      res.end(page);
    });
    await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
    const front = http.createServer(handler((upstream.address() as { port: number }).port));
    await new Promise<void>((resolve) => front.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${(front.address() as { port: number }).port}/ar`;
    try {
      const a = await fetch(url);
      const b = await fetch(url);
      const [ha, hb] = [await a.text(), await b.text()];
      const na = /'nonce-([^']+)'/.exec(directive(csp(a), "script-src"))?.[1];
      const nb = /'nonce-([^']+)'/.exec(directive(csp(b), "script-src"))?.[1];
      expect(na).toBeTruthy();
      expect(na).not.toBe(CSP_NONCE_PLACEHOLDER);
      expect(na).not.toBe(nb);
      expect(directive(csp(a), "script-src")).toContain("'strict-dynamic'");
      expect(ha.match(/<script nonce="/g)?.length).toBe(2);
      expect(ha.match(/<style nonce="/g)?.length).toBe(1);
      expect(ha).toContain(`nonce="${na}"`);
      expect(hb).toContain(`nonce="${nb}"`);
      expect(ha).toContain("<p>&lt;script&gt;</p>");
      expect(a.headers.get(CSP_INJECT_HEADER)).toBeNull();
      expect(cacheControl(a)).toContain("private");
      expect(cacheControl(a)).not.toContain("s-maxage");
    } finally {
      front.close();
      upstream.close();
    }
  });
});

describe("F68: without the nonce server (dev, tests, plain next start) public pages keep a per-request nonce", () => {
  for (const path of ["/ar", "/en/articles"]) {
    it(`${path}: fresh nonce per request, strict-dynamic`, async () => {
      const a = await hit(path);
      const b = await hit(path);
      const na = /'nonce-([^']+)'/.exec(directive(csp(a), "script-src"))?.[1];
      const nb = /'nonce-([^']+)'/.exec(directive(csp(b), "script-src"))?.[1];
      expect(na).toBeTruthy();
      expect(na).not.toBe(nb);
      expect(directive(csp(a), "script-src")).toContain("'strict-dynamic'");
    });
  }
});

describe("F68: signed-in, checkout, payment and account pages carry a nonce CSP and no-store", () => {
  for (const path of PRIVATE_PAGES) {
    it(`${path}: fresh nonce per request + strict-dynamic, no unsafe-inline, Cache-Control no-store`, async () => {
      const a = await hit(path, "nabd_access=a.b.c");
      const b = await hit(path, "nabd_access=a.b.c");
      const sa = directive(csp(a), "script-src");
      const sb = directive(csp(b), "script-src");
      const na = /'nonce-([^']+)'/.exec(sa)?.[1];
      const nb = /'nonce-([^']+)'/.exec(sb)?.[1];
      expect(na).toBeTruthy();
      expect(nb).toBeTruthy();
      expect(na).not.toBe(nb);
      expect(sa).toContain("'strict-dynamic'");
      expect(sa).not.toContain("'unsafe-inline'");
      expect(sa).not.toContain("'unsafe-eval'");
      expect(directive(csp(a), "frame-ancestors")).toBe("frame-ancestors 'none'");
      expect(cacheControl(a)).toContain("no-store");
    });
    it(`${path}: no-store even without a session cookie (the page itself is private)`, async () => {
      const r = await hit(path);
      // An unauthenticated visit may redirect to login; whatever answers must not be cacheable HTML.
      expect(cacheControl(r)).toContain("no-store");
    });
  }
});

describe("F68: no cached HTML with a session cookie", () => {
  for (const cookie of ["nabd_access=a.b.c", "nabd_refresh=r.r.r"]) {
    for (const path of ["/ar", "/en/articles", "/en/p/panadol-500mg"]) {
      it(`${path} with ${cookie.split("=")[0]}: Cache-Control no-store`, async () => {
        const r = await hit(path, cookie);
        expect(cacheControl(r)).toContain("no-store");
      });
    }
  }
});

describe("F68: HSTS and frame-ancestors are kept", () => {
  it("next.config headers(): HSTS >= 1 year with includeSubDomains, and framing denied, in production", async () => {
    const cfg = (await import("../../next.config")).default as { headers?: () => Promise<Array<{ source: string; headers: Array<{ key: string; value: string }> }>> };
    expect(typeof cfg.headers).toBe("function");
    const rules = await cfg.headers!();
    const all = rules.flatMap((r) => r.headers);
    const hsts = all.find((h) => h.key.toLowerCase() === "strict-transport-security")?.value || "";
    expect(Number(/max-age=(\d+)/.exec(hsts)?.[1] || 0)).toBeGreaterThanOrEqual(31536000);
    expect(hsts).toContain("includeSubDomains");
    const xfo = all.find((h) => h.key.toLowerCase() === "x-frame-options")?.value || "";
    const cspHeader = all.find((h) => h.key.toLowerCase() === "content-security-policy")?.value || "";
    expect(xfo.toUpperCase() === "DENY" || /frame-ancestors 'none'/.test(cspHeader)).toBe(true);
  });
});
