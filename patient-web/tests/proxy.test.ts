import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({ default: () => () => new Response() }));
vi.mock("../i18n/routing", () => ({ routing: { locales: ["ar", "en", "ur", "hi", "bn", "fil"] } }));

import { proxy } from "../proxy";

function request(pathname: string) {
  return new NextRequest(new URL(pathname, "https://nabd.plus"));
}

describe("indexing response policy", () => {
  it("keeps the six public locale entry points free of an HTTP noindex header", () => {
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      expect(proxy(request(`/${locale}`)).headers.get("x-robots-tag")).toBeNull();
    }
  });

  it("adds a noindex header to private portal routes and the root redirect", () => {
    for (const pathname of ["/", "/en/login", "/ar/dashboard", "/ur/orders", "/hi/health", "/bn/reminders"]) {
      expect(proxy(request(pathname)).headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    }
  });

  // I-wave1: login-free public discovery surfaces are indexable (synced with sitemap).
  it("keeps public catalog surfaces free of an HTTP noindex header", () => {
    for (const pathname of ["/ar/medicine-catalog", "/en/specialties", "/ur/articles", "/fil/medicine-catalog"]) {
      expect(proxy(request(pathname)).headers.get("x-robots-tag")).toBeNull();
    }
  });

  it("adds a fresh nonce CSP without unsafe-inline scripts", () => {
    const first = proxy(request("/ar"));
    const second = proxy(request("/ar"));
    const firstPolicy = first.headers.get("content-security-policy");
    const secondPolicy = second.headers.get("content-security-policy");

    expect(firstPolicy).toContain("script-src 'self' 'nonce-");
    expect(firstPolicy).toContain("'strict-dynamic'");
    expect(firstPolicy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(firstPolicy).not.toBe(secondPolicy);
  });


});
