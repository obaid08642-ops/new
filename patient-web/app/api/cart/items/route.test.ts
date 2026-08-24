import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { POST } from "./route";

function request(body: unknown, key = "idempotency-cart-test-123456") {
  return new Request("https://web.test/api/cart/items", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(body) });
}

describe("cart item BFF", () => {
  beforeEach(() => {
    state.callPatientApi.mockReset();
    state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined);
  });
  it("rejects invalid idempotency and ambiguous medicines", async () => {
    expect((await POST(request({ medicine_id: "med-1", quantity: 1 }, "short"))).status).toBe(400);
    expect((await POST(request({ medicine_id: "med-1", manual_name: "دواء", quantity: 1 }))).status).toBe(400);
  });
  it("requires a server session", async () => {
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await POST(request({ medicine_id: "med-1", quantity: 1 }))).status).toBe(401);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });
  it("forwards only verified input and idempotency", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ cart: "ignored" }), { status: 201 }));
    const response = await POST(request({ medicine_id: "med-1", quantity: 2 }));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ ok: true });
    expect(state.callPatientApi).toHaveBeenCalledWith("/cart/items", expect.objectContaining({ headers: expect.objectContaining({ "idempotency-key": "idempotency-cart-test-123456", "x-device-id": "device-1" }), body: JSON.stringify({ medicine_id: "med-1", quantity: 2 }) }), "server-access");
  });
});
