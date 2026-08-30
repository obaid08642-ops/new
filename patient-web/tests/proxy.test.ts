import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({ default: () => () => new Response() }));
vi.mock("../i18n/routing", () => ({ routing: { locales: ["ar", "en", "ur", "hi", "bn", "fil"] } }));

import { proxy } from "../proxy";

function request(pathname: string) {
  return new NextRequest(new URL(pathname, "https://nabd.plus"));
}

describe("indexing response policy", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("keeps the six public locale entry points free of an HTTP noindex header", async () => {
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      expect((await proxy(request(`/${locale}`))).headers.get("x-robots-tag")).toBeNull();
    }
  });

  it("keeps v14 product pages, category clusters and the catalogue landing indexable", async () => {
    for (const pathname of ["/en/p/abilify-aripiprazole-15-mg-28-tablets", "/ar/p/%D8%A3%D8%AF%D9%88%D9%84", "/en/c", "/ar/c/%D8%A7%D9%84%D8%A3%D8%AF%D9%88%D9%8A%D8%A9", "/en/medicine-catalog", "/ar/articles"]) {
      expect((await proxy(request(pathname))).headers.get("x-robots-tag")).toBeNull();
    }
  });

  it("adds a noindex header to private portal routes and the root redirect", async () => {
    for (const pathname of ["/", "/en/login", "/ar/dashboard", "/ur/orders", "/hi/health", "/bn/reminders", "/fil/wishlist"]) {
      expect((await proxy(request(pathname))).headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    }
  });

  it("permanently redirects legacy medicine URLs (308) to the canonical v14 product page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ slug: "adol-syrup-100-ml" }), { status: 200 })));
    const res = await proxy(request("/en/medicines/med_v14_100035"));
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("https://nabd.plus/en/p/adol-syrup-100-ml");
  });

  it("passes legacy URLs through when the product is not public", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
    const res = await proxy(request("/en/medicines/unknown-id"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  });

  it("adds a fresh nonce CSP without unsafe-inline scripts", async () => {
    const first = await proxy(request("/ar"));
    const second = await proxy(request("/ar"));
    const firstPolicy = first.headers.get("content-security-policy");
    const secondPolicy = second.headers.get("content-security-policy");

    expect(firstPolicy).toContain("script-src 'self' 'nonce-");
    expect(firstPolicy).toContain("'strict-dynamic'");
    expect(firstPolicy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(firstPolicy).not.toBe(secondPolicy);
  });
});
