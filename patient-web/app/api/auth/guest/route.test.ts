import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.fn();
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: (...a: unknown[]) => callPatientApi(...a) }));

import { POST } from "./route";

const okUpstream = () => new Response(JSON.stringify({ token: { accessToken: "a", refreshToken: "r" }, user: { id: "g1" } }), { status: 201, headers: { "content-type": "application/json" } });
const sentDevice = () => (callPatientApi.mock.calls.at(-1)?.[1] as { headers: Record<string, string> }).headers["x-device-id"];

describe("POST /api/auth/guest (21.1: the device is the identity)", () => {
  beforeEach(() => { callPatientApi.mockReset(); callPatientApi.mockImplementation(async () => okUpstream()); });

  it("sends the device id of the header", async () => {
    await POST(new Request("http://x/api/auth/guest", { method: "POST", headers: { "x-nabd-device-id": "header-device-0001" } }));
    expect(sentDevice()).toBe("header-device-0001");
  });

  it("without the header it uses the device cookie, so a second tab or cleared storage reaches the SAME guest", async () => {
    await POST(new Request("http://x/api/auth/guest", { method: "POST", headers: { cookie: "a=1; nabd_device=cookie-device-0001; b=2" } }));
    expect(sentDevice()).toBe("cookie-device-0001");
  });

  it("a malformed header or cookie is not forwarded: a fresh random id is used instead", async () => {
    await POST(new Request("http://x/api/auth/guest", { method: "POST", headers: { "x-nabd-device-id": "x", cookie: "nabd_device=bad value!" } }));
    expect(sentDevice()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("stores the device id it used in the HttpOnly device cookie", async () => {
    const res = await POST(new Request("http://x/api/auth/guest", { method: "POST", headers: { "x-nabd-device-id": "header-device-0002" } }));
    const cookies = res.headers.getSetCookie().join("\n");
    expect(cookies).toMatch(/nabd_device=header-device-0002/);
    expect(cookies).toMatch(/HttpOnly/i);
  });
});
