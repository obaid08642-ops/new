import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));

import { POST as reorder } from "./reorder/route";
import { POST as cancel } from "./cancel/route";

const id = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ orderId: id }) };
function req(body: unknown = {}, headers: HeadersInit = {}) { return new Request("https://web.test/api/orders/" + id + "/mutation", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "order-mutation-key-123456", ...headers }, body: JSON.stringify(body) }); }

describe("order mutation BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("requires valid idempotency and authenticated ownership boundary", async () => {
    expect((await reorder(req({}, { "idempotency-key": "short" }), context)).status).toBe(400);
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await cancel(req(), context)).status).toBe(401);
    expect((await reorder(req(), { params: Promise.resolve({ orderId: "not-an-id" }) })).status).toBe(404);
  });
  it("forwards reorder and cancel with idempotency and bounded success", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ order_id: id, patient_id: "private" }), { status: 201 }));
    expect((await reorder(req(), context)).status).toBe(201);
    expect(state.callPatientApi).toHaveBeenCalledWith(`/orders/${id}/reorder`, expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "idempotency-key": "order-mutation-key-123456" }) }), "server-access");
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ status: "cancelled" }), { status: 200 }));
    const response = await cancel(req({ reason: "changed" }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
  it("preserves conflict status without private payload fields", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "cannot_cancel", internal_notes: "private" }), { status: 409 }));
    const response = await cancel(req(), context);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "cannot_cancel" });
  });
});
