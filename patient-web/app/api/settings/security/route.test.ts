import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));

import { PATCH } from "./route";

const request = (body: unknown) => new Request("https://web.test", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("security settings BFF", () => {
  beforeEach(() => {
    state.callPatientApi.mockReset();
    state.cookieStore.get.mockImplementation((name: string) => (name === "nabd_access" ? { value: "access" } : undefined));
  });

  it("accepts only the two_factor flag", async () => {
    expect((await PATCH(request({ two_factor: "yes" }))).status).toBe(400);
    expect((await PATCH(request({ two_factor: true, biometric: true }))).status).toBe(400);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await PATCH(request({ two_factor: true }))).status).toBe(401);
  });

  it("forwards the flag and relays an upstream failure", async () => {
    state.callPatientApi.mockResolvedValueOnce(new Response(JSON.stringify({ two_factor: true }), { status: 200 }));
    expect((await PATCH(request({ two_factor: true }))).status).toBe(200);
    expect(state.callPatientApi.mock.calls[0][0]).toBe("/users/me/security-settings");
    expect(JSON.parse(state.callPatientApi.mock.calls[0][1].body)).toEqual({ two_factor: true });
    state.callPatientApi.mockResolvedValueOnce(new Response("{}", { status: 500 }));
    expect((await PATCH(request({ two_factor: false }))).status).toBe(500);
  });
});
