import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));

import { POST } from "./route";

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://web.test/api/cart/items", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "cart-item-key-123456", ...headers }, body: JSON.stringify(body) });
}
const valid = { medicine_id: "medicine-1", quantity: 2 };

describe("cart item mutation BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("requires idempotency, validates item identity, and requires session", async () => {
    expect((await POST(request(valid, { "idempotency-key": "short" }))).status).toBe(400);
    expect((await POST(request({ quantity: 1 }))).status).toBe(400);
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await POST(request(valid))).status).toBe(401);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });
  it("forwards the owner mutation with idempotency and returns bounded success", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ line_id: "line-1", total: 99, access_token: "must-not-leak" }), { status: 201 }));
    const response = await POST(request(valid));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
    expect(state.callPatientApi).toHaveBeenCalledWith("/cart/items", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "idempotency-key": "cart-item-key-123456" }) }), "server-access");
  });
  it("preserves bounded conflict status without fabricating success", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "stock_changed", private_notes: "must-not-leak" }), { status: 409 }));
    const response = await POST(request(valid));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "stock_changed" });
  });
});
