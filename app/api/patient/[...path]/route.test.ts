import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  values: new Map<string, string>(),
  callPatientApi: vi.fn(),
  clearSessionCookies: vi.fn(),
  setSessionCookies: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => {
    const value = state.values.get(name);
    return value ? { value } : undefined;
  } }),
}));

vi.mock("@/lib/auth/cookies", () => ({
  authCookieNames: { access: "nabd_access", refresh: "nabd_refresh", device: "nabd_device" },
  clearSessionCookies: state.clearSessionCookies,
  setSessionCookies: state.setSessionCookies,
}));

vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("@/lib/api/response", () => ({
  forwardApiResponse: async (upstream: Response) => new Response(null, { status: upstream.status }),
}));

import { GET } from "./route";

function request() {
  return {
    method: "GET",
    headers: new Headers(),
    nextUrl: new URL("https://web.nabd.plus/api/patient/orders/mine"),
  } as never;
}

function context() {
  return { params: Promise.resolve({ path: ["orders", "mine"] }) };
}

describe("patient BFF session rotation", () => {
  beforeEach(() => {
    state.values = new Map([
      ["nabd_access", "expired-access"],
      ["nabd_refresh", "valid-refresh"],
      ["nabd_device", "device-1"],
    ]);
    state.callPatientApi.mockReset();
    state.clearSessionCookies.mockReset();
    state.setSessionCookies.mockReset();
  });

  it("rotates once on upstream 401, retries with the new access token, and sets only returned tokens", async () => {
    state.callPatientApi
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "new-access", refreshToken: "new-refresh" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const response = await GET(request(), context());

    expect(response.status).toBe(200);
    expect(state.callPatientApi).toHaveBeenCalledTimes(3);
    expect(state.callPatientApi).toHaveBeenNthCalledWith(1, "/orders/mine", expect.any(Object), "expired-access");
    expect(state.callPatientApi).toHaveBeenNthCalledWith(2, "/auth/refresh", expect.objectContaining({ body: JSON.stringify({ refresh_token: "valid-refresh" }) }));
    expect(state.callPatientApi).toHaveBeenNthCalledWith(3, "/orders/mine", expect.any(Object), "new-access");
    expect(state.setSessionCookies).toHaveBeenCalledWith(expect.any(Response), { accessToken: "new-access", refreshToken: "new-refresh" }, "device-1");
    expect(state.clearSessionCookies).not.toHaveBeenCalled();
  });

  it("does not refresh without both refresh and device cookies, and clears the failed session", async () => {
    state.values.delete("nabd_refresh");
    state.callPatientApi.mockResolvedValueOnce(new Response(null, { status: 401 }));

    const response = await GET(request(), context());

    expect(response.status).toBe(401);
    expect(state.callPatientApi).toHaveBeenCalledTimes(1);
    expect(state.clearSessionCookies).toHaveBeenCalledWith(expect.any(Response));
    expect(state.setSessionCookies).not.toHaveBeenCalled();
  });

  it("rejects incomplete refresh responses and clears the expired session without retrying", async () => {
    state.callPatientApi
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: "incomplete" }), { status: 200 }));

    const response = await GET(request(), context());

    expect(response.status).toBe(401);
    expect(state.callPatientApi).toHaveBeenCalledTimes(2);
    expect(state.clearSessionCookies).toHaveBeenCalledWith(expect.any(Response));
    expect(state.setSessionCookies).not.toHaveBeenCalled();
  });

  it("does not proxy an unlisted resource before reading or refreshing a session", async () => {
    const response = await GET(request(), { params: Promise.resolve({ path: ["medical-profile"] }) });

    expect(response.status).toBe(404);
    expect(state.callPatientApi).not.toHaveBeenCalled();
    expect(state.clearSessionCookies).not.toHaveBeenCalled();
  });
});
