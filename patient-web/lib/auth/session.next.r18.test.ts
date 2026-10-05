import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 7d27a4e / R18: a signed-out visit to a protected page (for example a deep
// link from the app or a message) goes to login with ?next=<that page>, so the
// login form can continue there (lib/deep-links/post-login.ts).
const state = vi.hoisted(() => ({ cookie: undefined as string | undefined, path: null as string | null, redirect: vi.fn((url: string) => { throw new Error(`REDIRECT ${url}`); }) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }),
  headers: async () => ({ get: (name: string) => (name === "x-nabd-path" ? state.path : null) }),
}));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("next-intl/middleware", () => ({ default: () => (req: NextRequest) => new Response(req.headers.get("x-nabd-path") ?? "", { status: 200 }) }));
vi.mock("../../i18n/routing", () => ({ routing: { locales: ["ar", "en", "ur", "hi", "bn", "fil"] } }));

import { requirePatientAccess } from "./session";
import { proxy } from "../../proxy";

beforeEach(() => { state.cookie = undefined; state.path = null; state.redirect.mockClear(); });

describe("login with ?next (R18)", () => {
  it("keeps the requested page for after sign-in", async () => {
    state.path = "/ar/orders/91047ef2-ad36-422a-a184-629693e7c729/tracking?pay=1";
    await expect(requirePatientAccess("ar")).rejects.toThrow("REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith(`/ar/login?next=${encodeURIComponent("/ar/orders/91047ef2-ad36-422a-a184-629693e7c729/tracking?pay=1")}`);
  });

  it("falls back to plain login when the path is unknown or unsafe", async () => {
    for (const path of [null, "//evil.example/x", "https://evil.example", "/api/auth/logout"]) {
      state.path = path;
      state.redirect.mockClear();
      await expect(requirePatientAccess("en")).rejects.toThrow("REDIRECT");
      expect(state.redirect).toHaveBeenCalledWith("/en/login");
    }
  });

  it("returns the token when signed in", async () => {
    state.cookie = "tok";
    await expect(requirePatientAccess("ar")).resolves.toBe("tok");
  });

  it("the proxy passes the requested path to the page", async () => {
    const res = await proxy(new NextRequest(new URL("/ar/orders?x=1", "https://nabd.plus")));
    expect(await res.text()).toBe("/ar/orders?x=1");
  });
});
