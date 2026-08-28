import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));

import { POST } from "./route";

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://web.test/api/cart/checkout", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "checkout-key-123456", ...headers }, body: JSON.stringify(body) });
}
const valid = { address_id: "address-1", cash: true };

describe("cart checkout BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("requires idempotency, address, payment method, and session", async () => {
    expect((await POST(request(valid, { "idempotency-key": "short" }))).status).toBe(400);
    expect((await POST(request({ address_id: "address-1" }))).status).toBe(400);
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await POST(request(valid))).status).toBe(401);
  });
  it("forwards checkout without client totals and returns server-authoritative result", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ order_id: "22222222-2222-4222-8222-222222222222", status: "pending", total: 148.5, payment_intent: { id: "pi-1", status: "requires_action", private: "drop" }, client_total: 1, patient_id: "private" }), { status: 201 }));
    const response = await POST(request({ ...valid, total: 1 }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ order_id: "22222222-2222-4222-8222-222222222222", status: "pending", total: 148.5, payment_intent: { id: "pi-1", status: "requires_action", private: "drop" } });
    const call = state.callPatientApi.mock.calls[0];
    expect(call[0]).toBe("/cart/checkout");
    expect(JSON.parse(call[1].body)).not.toHaveProperty("total");
  });
  it("preserves payment conflict status without private payload", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "payment_failed", card_secret: "private" }), { status: 402 }));
    const response = await POST(request({ address_id: "address-1", payment_method_id: "method-1" }));
    expect(response.status).toBe(402);
    expect(await response.json()).toEqual({ message: "payment_failed" });
  });
});
