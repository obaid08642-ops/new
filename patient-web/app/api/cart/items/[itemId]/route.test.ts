import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));

import { DELETE, PATCH } from "./route";

function request(method: "PATCH" | "DELETE", body?: unknown, headers: HeadersInit = {}) {
  return new Request("https://web.test/api/cart/items/line-1", { method, headers: { "content-type": "application/json", "idempotency-key": "cart-line-key-123456", ...headers }, body: method === "PATCH" ? JSON.stringify(body) : undefined });
}

describe("cart line mutation BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("requires a valid idempotency key, payload, and session", async () => {
    expect((await PATCH(request("PATCH", { quantity: 2 }, { "idempotency-key": "short" }), { params: Promise.resolve({ itemId: "line-1" }) })).status).toBe(400);
    expect((await PATCH(request("PATCH", { quantity: 0 }), { params: Promise.resolve({ itemId: "line-1" }) })).status).toBe(400);
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await DELETE(request("DELETE"), { params: Promise.resolve({ itemId: "line-1" }) })).status).toBe(401);
  });
  it("forwards PATCH and DELETE with idempotency and bounded success", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ line_id: "line-1", total: 99 }), { status: 200 }));
    expect((await PATCH(request("PATCH", { quantity: 3 }), { params: Promise.resolve({ itemId: "line-1" }) })).status).toBe(200);
    expect(state.callPatientApi).toHaveBeenCalledWith("/cart/items/line-1", expect.objectContaining({ method: "PATCH", headers: expect.objectContaining({ "idempotency-key": "cart-line-key-123456" }) }), "server-access");
    expect((await DELETE(request("DELETE"), { params: Promise.resolve({ itemId: "line-1" }) })).status).toBe(200);
  });
  it("preserves conflict status without private payload fields", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "line_not_owned", patient_id: "private" }), { status: 404 }));
    const response = await DELETE(request("DELETE"), { params: Promise.resolve({ itemId: "line-1" }) });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "line_not_owned" });
  });
});
