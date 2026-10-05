// R11 §5 lead 14: patient-web had no CSRF defence beyond SameSite=Lax
// (assertSameOrigin was never imported), and /api/auth/login parses a
// text/plain form body, so another site could log a victim into the
// attacker's account. Every state-changing /api request now goes through the
// proxy, which refuses a cross-site browser request.
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({ default: () => () => new Response() }));
vi.mock("../i18n/routing", () => ({ routing: { locales: ["ar", "en", "ur", "hi", "bn", "fil"] } }));

import { config, proxy } from "../proxy";

function api(method: string, headers: Record<string, string>) {
  return new NextRequest(new URL("/api/auth/login", "https://nabd.plus"), { method, headers: { host: "nabd.plus", ...headers }, body: method === "GET" ? undefined : "x" });
}

describe("CSRF on patient-web API routes", () => {
  it("the proxy runs for /api routes", () => {
    const patterns = config.matcher.map((m) => new RegExp(`^${m}$`));
    expect(patterns.some((p) => p.test("/api/auth/login"))).toBe(true);
  });

  it("refuses a cross-site POST (login CSRF with a text/plain form)", async () => {
    const res = await proxy(api("POST", { origin: "https://evil.example", "content-type": "text/plain", "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
  });

  it("refuses a cross-origin POST from a browser that sends only Origin", async () => {
    expect((await proxy(api("POST", { origin: "https://evil.example" }))).status).toBe(403);
  });

  it("refuses a POST from a sibling subdomain", async () => {
    expect((await proxy(api("DELETE", { "sec-fetch-site": "same-site", origin: "https://other.nabd.plus" }))).status).toBe(403);
  });

  it("lets the site's own requests and non-browser callers through", async () => {
    expect((await proxy(api("POST", { origin: "https://nabd.plus", "sec-fetch-site": "same-origin" }))).status).toBe(200);
    expect((await proxy(api("POST", {}))).status).toBe(200);
    expect((await proxy(api("GET", { origin: "https://evil.example", "sec-fetch-site": "cross-site" }))).status).toBe(200);
  });
});
