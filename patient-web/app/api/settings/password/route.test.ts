import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));

import { POST } from "./route";

const request = (body: unknown) => new Request("https://web.test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const valid = { current_password: "old-password", new_password: "a-new-password-1" };

describe("change-password BFF", () => {
  beforeEach(() => {
    state.callPatientApi.mockReset();
    state.cookieStore.get.mockImplementation((name: string) => (name === "nabd_access" ? { value: "access" } : name === "nabd_device" ? { value: "dev-1" } : undefined));
  });

  it("rejects a short new password and a missing session", async () => {
    expect((await POST(request({ ...valid, new_password: "short" }))).status).toBe(400);
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await POST(request(valid))).status).toBe(401);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });

  it("forwards the change with the device id and replaces the cookies with the rotated pair", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ success: true, access_token: "a.b.c", refresh_token: "r" }), { status: 201 }));
    const response = await POST(request(valid));
    expect(response.status).toBe(200);
    const [path, init] = state.callPatientApi.mock.calls[0];
    expect(path).toBe("/users/me/change-password");
    expect((init.headers as Record<string, string>)["x-device-id"]).toBe("dev-1");
    expect(response.cookies.get("nabd_access")?.value).toBe("a.b.c");
    expect(response.cookies.get("nabd_refresh")?.value).toBe("r");
  });

  it("passes a wrong current password (401) through without touching the cookies", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "wrong" }), { status: 401 }));
    const response = await POST(request(valid));
    expect(response.status).toBe(401);
    expect(response.cookies.get("nabd_access")).toBeUndefined();
  });
});
