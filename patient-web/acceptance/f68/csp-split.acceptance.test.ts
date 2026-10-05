// ACCEPTANCE — F68 (owner change, 2026-10-05): split CSP by page kind.
// Written by the reviewer before the fix; the implementing agent makes it pass and
// may not edit it.
//
//  - Public pages (the indexable surfaces: locale home, articles, products,
//    catalogue, doctor/lab/radiology listings…) get a HASH-based CSP: script-src
//    allows 'self' plus 'sha256-…'/'sha384-…'/'sha512-…' sources, no nonce, no
//    'unsafe-inline', no 'unsafe-eval' — the same header on every request, so the
//    HTML can be cached by the CDN.
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

describe("F68: public pages carry a hash-based CSP (cacheable HTML)", () => {
  for (const path of PUBLIC_PAGES) {
    it(`${path}: script-src uses hashes, no nonce, no unsafe-inline/eval; same policy on every request`, async () => {
      const a = await hit(path);
      const b = await hit(path);
      const script = directive(csp(a), "script-src");
      expect(script).toMatch(/'sha(256|384|512)-[A-Za-z0-9+/=]+'/);
      expect(script).not.toMatch(/'nonce-/);
      expect(script).not.toContain("'unsafe-inline'");
      expect(script).not.toContain("'unsafe-eval'");
      expect(csp(b)).toBe(csp(a));
      expect(directive(csp(a), "frame-ancestors")).toBe("frame-ancestors 'none'");
      expect(cacheControl(a)).not.toContain("no-store");
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
