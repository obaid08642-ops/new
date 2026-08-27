import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));

import { POST } from "./route";

function request(body: unknown, headers: HeadersInit = {}) { return new Request("https://web.test/api/appointments/book", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "idempotency-test-123456", ...headers }, body: JSON.stringify(body) }); }
const valid = { doctor_id: "11111111-1111-4111-8111-111111111111", service_type: "video", slot_start: "2026-08-28T10:00:00.000Z", payment_method: "card" };

describe("governed appointment booking BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined); });
  it("requires an idempotency key and validates the governed appointment body", async () => {
    expect((await POST(request(valid, { "idempotency-key": "short" }))).status).toBe(400);
    expect((await POST(request({ ...valid, payment_method: "wallet" }))).status).toBe(400);
    expect((await POST(request({ ...valid, total: 1 }))).status).toBe(400);
  });
  it("requires an httpOnly access session", async () => {
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await POST(request(valid))).status).toBe(401);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });
  it("forwards only the governed appointment payload and returns only its public state", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "22222222-2222-4222-8222-222222222222", status: "PENDING", insurance_request_id: "33333333-3333-4333-8333-333333333333", patient_id: "must-not-leak", total_price: 999 }), { status: 201 }));
    const response = await POST(request(valid));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ id: "22222222-2222-4222-8222-222222222222", status: "PENDING", insurance_request_id: "33333333-3333-4333-8333-333333333333" });
    expect(state.callPatientApi).toHaveBeenCalledWith("/care/appointments", expect.objectContaining({ headers: expect.objectContaining({ "idempotency-key": "idempotency-test-123456", "x-device-id": "device-1" }), body: JSON.stringify(valid) }), "server-access");
  });
  it("preserves upstream conflict status without fabricating success", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "slot_taken" }), { status: 409 }));
    const response = await POST(request(valid));
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ message: "slot_taken" });
  });
  it("rejects an invalid upstream response instead of inventing an appointment state", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "legacy-id", status: "pending_payment" }), { status: 201 }));
    const response = await POST(request(valid));
    expect(response.status).toBe(502); expect(await response.json()).toEqual({ message: "unexpected_appointment_response" });
  });
});
