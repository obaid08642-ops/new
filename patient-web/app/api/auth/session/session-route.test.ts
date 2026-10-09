import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ cookie: undefined as string | undefined, callPatientApi: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));

import { GET } from "./route";

describe("GET /api/auth/session", () => {
  beforeEach(() => { state.cookie = undefined; state.callPatientApi.mockReset(); });

  it("answers 200 authenticated:false with no session cookie, so the register probe logs no 401", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ authenticated: false });
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });

  it("answers 200 authenticated:false when the session is expired (upstream 401)", async () => {
    state.cookie = "stale";
    state.callPatientApi.mockResolvedValue(new Response("{}", { status: 401 }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).authenticated).toBe(false);
  });

  it("returns the user for a live session", async () => {
    state.cookie = "live";
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "u1", is_guest: true }), { status: 200 }));
    const body = await (await GET()).json();
    expect(body).toEqual({ authenticated: true, user: { id: "u1", is_guest: true } });
  });

  it("refreshes an expired access token and answers authenticated:true with the new cookies", async () => {
    state.cookie = "stale";
    state.callPatientApi.mockImplementation(async (path: string, _init: unknown, token?: string) => {
      if (path === "/auth/refresh") return new Response(JSON.stringify({ accessToken: "fresh", refreshToken: "fresh-r" }), { status: 200 });
      return token === "fresh" ? new Response(JSON.stringify({ id: "u1" }), { status: 200 }) : new Response("{}", { status: 401 });
    });
    const res = await GET();
    expect(await res.json()).toEqual({ authenticated: true, user: { id: "u1" } });
    expect(res.headers.get("set-cookie")).toContain("nabd_access=fresh");
  });

  it("answers authenticated:false when the refresh token is refused too", async () => {
    state.cookie = "stale";
    state.callPatientApi.mockResolvedValue(new Response("{}", { status: 401 }));
    expect((await (await GET()).json()).authenticated).toBe(false);
  });

  it("still passes an upstream outage through as an error status", async () => {
    state.cookie = "live";
    state.callPatientApi.mockResolvedValue(new Response("{}", { status: 503 }));
    expect((await GET()).status).toBe(503);
  });
});
