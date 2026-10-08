// F82-3: what proxy.ts does for the static/ISR public pages (the F68 acceptance tests cover the rest and are untouched).
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { THEME_INIT_SCRIPT } from "../app/theme";

vi.mock("next-intl/middleware", async () => {
  const { NextResponse: Response } = await import("next/server");
  return { default: () => () => Response.next({ headers: { "x-test-i18n": "kept" } }) };
});
vi.mock("../i18n/routing", () => ({ routing: { locales: ["ar", "en", "ur", "hi", "bn", "fil"], defaultLocale: "ar" } }));

let env: string | undefined;
beforeEach(() => { env = process.env.NODE_ENV; (process.env as Record<string, string>).NODE_ENV = "production"; process.env.NABD_CSP_EDGE_NONCE = "1"; vi.resetModules(); });
afterEach(() => { (process.env as Record<string, string | undefined>).NODE_ENV = env; delete process.env.NABD_CSP_EDGE_NONCE; });

async function hit(path: string, headers: Record<string, string> = {}) {
  const { proxy } = await import("../proxy");
  return (await proxy(new NextRequest(new URL(path, "https://nabd.plus"), { headers: { accept: "text/html", ...headers } }))) as NextResponse;
}
const csp = (r: Response) => r.headers.get("content-security-policy") || "";
const cache = (r: Response) => (r.headers.get("cache-control") || "").toLowerCase();
const rewriteOf = (r: Response) => r.headers.get("x-middleware-rewrite");

describe("the policy allows the theme script by its hash", () => {
  it("the hash is the sha256 of the exact script the layout renders, and the policy stays strict", async () => {
    const { contentSecurityPolicy, THEME_SCRIPT_HASH } = await import("../lib/security/csp");
    expect(THEME_SCRIPT_HASH).toBe(`sha256-${createHash("sha256").update(THEME_INIT_SCRIPT).digest("base64")}`);
    const script = contentSecurityPolicy("abc", false).split("; ").find((d) => d.startsWith("script-src "))!;
    expect(script).toContain(`'${THEME_SCRIPT_HASH}'`);
    expect(script).toContain("'nonce-abc'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });
});

describe("a public page is the same cached HTML for every visitor", () => {
  it.each(["/ar", "/en/c/x", "/ar/p/x", "/ur/articles", "/hi/consultations/doctors", "/ar/doctor/x"])("%s with a session cookie takes the stamping path, never stored", async (path) => {
    const { CSP_INJECT_HEADER, CSP_NONCE_PLACEHOLDER } = await import("../lib/security/csp");
    const r = await hit(path, { cookie: "nabd_access=a.b.c" });
    expect(r.headers.get(CSP_INJECT_HEADER)).toBe("1");
    expect(csp(r)).toContain(`'nonce-${CSP_NONCE_PLACEHOLDER}'`);
    expect(cache(r)).toContain("no-store");
    expect(r.headers.get("x-robots-tag")).toBeNull();
  });

  it("without a session it is left cacheable (no Cache-Control from the proxy)", async () => {
    const r = await hit("/ar");
    expect(cache(r)).toBe("");
  });

  it("a private page keeps its per-request nonce and no-store even with the nonce server in front", async () => {
    const { CSP_INJECT_HEADER, CSP_NONCE_PLACEHOLDER } = await import("../lib/security/csp");
    const r = await hit("/ar/cart");
    expect(r.headers.get(CSP_INJECT_HEADER)).toBeNull();
    expect(csp(r)).not.toContain(CSP_NONCE_PLACEHOLDER);
    expect(csp(r)).toMatch(/'nonce-[^']+'/);
    expect(cache(r)).toContain("no-store");
    expect(r.headers.get("x-robots-tag")).toContain("noindex");
  });
});

describe("the unavailable page", () => {
  it("is stamped like a public page but never stored and never indexed", async () => {
    const { CSP_INJECT_HEADER } = await import("../lib/security/csp");
    const r = await hit("/ar/unavailable");
    expect(r.headers.get(CSP_INJECT_HEADER)).toBe("1");
    expect(cache(r)).toContain("no-store");
    expect(r.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("when the nonce server asks again for a failed public page the request is a public one (stamped); the rewrite to the page is the config's", async () => {
    const { CSP_INJECT_HEADER } = await import("../lib/security/csp");
    const r = await hit("/en/c/vitamins?page=2", { "x-nabd-unavailable": "1" });
    expect(r.headers.get(CSP_INJECT_HEADER)).toBe("1");
    // the proxy itself never rewrites to the twin or to the unavailable page: an absolute rewrite made here would be taken
    // for an external one (and proxied) whenever Next is bound to an IP address, as it is behind the nonce server
    expect(r.headers.get("x-middleware-rewrite")).toBeNull();
  });
});

describe("the dynamic twins of the list pages and the unavailable page are config rewrites", () => {
  it("one rewrite per route and parameter, before the filesystem, with a non-empty value, to the twin under /q", async () => {
    const { queryTwinRewrites, QUERY_TWIN_RULES } = await import("../lib/security/query-twin");
    const rewrites = queryTwinRewrites();
    expect(rewrites).toHaveLength(QUERY_TWIN_RULES.reduce((n, rule) => n + rule.params.length, 0));
    for (const rewrite of rewrites) {
      expect(rewrite.has).toHaveLength(1);
      expect(rewrite.has[0]).toMatchObject({ type: "query", value: ".+" });
      expect(rewrite.destination).toMatch(/^\/:locale\/q\//);
      expect(rewrite.source).toContain(":locale(ar|en|ur|hi|bn|fil)");
    }
    const keys = (path: string) => rewrites.filter((r) => r.source.includes(path)).map((r) => r.has[0].key).sort();
    expect(keys("/c/:path*")).toEqual(["page", "q"]);
    expect(keys("/consultations/doctors")).toEqual(["q", "sort", "specialty"]);
    expect(keys("/articles")).toEqual(["category", "q"]);
  });

  it("next.config.ts runs them (and the unavailable page's, on the nonce server's header) before the filesystem", async () => {
    vi.doUnmock("next-intl/middleware");
    const config = (await import("../next.config")).default as { rewrites?: () => Promise<{ beforeFiles: Array<{ source: string; has?: Array<{ type: string; key: string; value?: string }> }> }> };
    const { beforeFiles } = await config.rewrites!();
    const { UNAVAILABLE_FALLBACK_HEADER } = await import("../lib/security/query-twin");
    expect(beforeFiles.filter((r) => r.has?.[0]?.type === "query")).toHaveLength(7);
    const fallback = beforeFiles.find((r) => r.has?.[0]?.type === "header")!;
    expect(fallback.has![0]).toMatchObject({ key: UNAVAILABLE_FALLBACK_HEADER, value: "1" });
    expect(fallback.source).toBe("/:locale(ar|en|ur|hi|bn|fil)/:path*");
  });

  it("the header is the same string the nonce server sends", async () => {
    const { UNAVAILABLE_FALLBACK_HEADER } = await import("../lib/security/query-twin");
    const server = await import("../server/nonce-transform.mjs");
    expect(server.UNAVAILABLE_FALLBACK_HEADER).toBe(UNAVAILABLE_FALLBACK_HEADER);
  });
});
