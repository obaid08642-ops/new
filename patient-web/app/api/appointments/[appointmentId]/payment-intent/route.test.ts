import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { POST } from "./route";
const id = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ appointmentId: id }) };
function req(headers: HeadersInit = {}) { return new Request(`https://web.test/api/appointments/${id}/payment-intent`, { method: "POST", headers: { "origin": "https://web.test", "referer": "https://web.test/", "idempotency-key": "payment-key-123456", ...headers } }); }
describe("payment intent BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("requires idempotency and a valid owned session", async () => {
    expect((await POST(req({ "idempotency-key": "short" }), context)).status).toBe(400);
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await POST(req(), context)).status).toBe(401);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });
  it("creates a safe intent and strips client secret/internal fields", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR", client_secret: "secret", patient_id: "private" }), { status: 201 }));
    const response = await POST(req(), context);
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ transactionId: "33333333-3333-4333-8333-333333333333", status: "pending", amount: 120, currency: "SAR" });
    expect(state.callPatientApi).toHaveBeenCalledWith("/payments/intent/consultation/22222222-2222-4222-8222-222222222222", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "idempotency-key": "payment-key-123456" }) }), "server-access");
  });
  it("preserves gateway and ownership errors without fabricating an intent", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "not_authorized" }), { status: 400 }));
    const response = await POST(req(), context);
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ message: "not_authorized" });
  });
  it("returns 404 for an invalid appointment identifier", async () => {
    const bad = { params: Promise.resolve({ appointmentId: "not-a-uuid" }) };
    expect((await POST(req(), bad)).status).toBe(404);
  });
});
