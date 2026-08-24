import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { POST } from "./route";

const addressId = "11111111-1111-4111-8111-111111111111";
function request(body: unknown, key = "idempotency-checkout-test-123456") {
  return new Request("https://web.test/api/cart/checkout", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(body) });
}

describe("cart checkout BFF", () => {
  beforeEach(() => {
    state.callPatientApi.mockReset();
    state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined);
  });
  it("accepts only a selected address and the implemented cash method", async () => {
    expect((await POST(request({ address_id: addressId, payment_method_id: "card" }))).status).toBe(400);
    expect((await POST(request({ payment_method_id: "cash" }))).status).toBe(400);
  });
  it("requires a server session", async () => {
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await POST(request({ address_id: addressId, payment_method_id: "cash" }))).status).toBe(401);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });
  it("returns the checked public checkout result", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ order_id: "22222222-2222-4222-8222-222222222222", status: "pending", total: 125, patient_id: "must-not-leak" }), { status: 201 }));
    const response = await POST(request({ address_id: addressId, payment_method_id: "cash" }));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ order_id: "22222222-2222-4222-8222-222222222222", status: "pending", total: 125 });
    expect(state.callPatientApi).toHaveBeenCalledWith("/cart/checkout", expect.objectContaining({ headers: expect.objectContaining({ "idempotency-key": "idempotency-checkout-test-123456", "x-device-id": "device-1" }) }), "server-access");
  });
  it("rejects an unrecognized success payload", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ order_id: "not-a-uuid", status: "pending", total: 1 }), { status: 201 }));
    expect((await POST(request({ address_id: addressId, payment_method_id: "cash" }))).status).toBe(502);
  });
});
