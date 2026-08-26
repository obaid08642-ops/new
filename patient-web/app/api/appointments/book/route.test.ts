import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));

import { POST } from "./route";

function request(body: unknown, headers: HeadersInit = {}) { return new Request("https://web.test/api/appointments/book", { method: "POST", headers: { "origin": "https://web.test", "referer": "https://web.test/", "content-type": "application/json", "idempotency-key": "idempotency-test-123456", ...headers }, body: JSON.stringify(body) }); }
const valid = { doctor_id: "11111111-1111-4111-8111-111111111111", type: "video", slot_id: "2026-08-25T10:00:00.000Z" };

describe("appointment booking BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined); });
  it("requires an idempotency key and validates the booking body", async () => {
    expect((await POST(request(valid, { "idempotency-key": "short" }))).status).toBe(400);
    expect((await POST(request({ ...valid, type: "invalid" }))).status).toBe(400);
  });
  it("requires an httpOnly access session", async () => {
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await POST(request(valid))).status).toBe(401);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });
  it("forwards the verified payload with idempotency and returns only the public result", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment", patient_id: "must-not-leak" }), { status: 201 }));
    const response = await POST(request(valid));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending_payment" });
    expect(state.callPatientApi).toHaveBeenCalledWith("/unified-bookings", expect.objectContaining({ headers: expect.objectContaining({ "idempotency-key": "idempotency-test-123456", "x-device-id": "device-1" }) }), "server-access");
  });
  it("preserves upstream conflict status without fabricating success", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "slot_taken" }), { status: 409 }));
    const response = await POST(request(valid));
    expect(response.status).toBe(409); expect(await response.json()).toEqual({ message: "slot_taken" });
  });
  it("insurance branch books without payment then submits the coverage request", async () => {
    state.callPatientApi.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/unified-bookings") {
        const sent = JSON.parse(String(init?.body));
        if (sent.payment_method !== "insurance" || "coverage" in sent) return new Response(JSON.stringify({ message: "bad_payload" }), { status: 400 });
        return new Response(JSON.stringify({ booking_id: "22222222-2222-4222-8222-222222222222", status: "pending" }), { status: 201 });
      }
      if (path === "/insurance/requests") {
        const sent = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ id: "33333333-3333-4333-8333-333333333333", booking_id: sent.booking_id, booking_kind: sent.booking_kind }), { status: 201 });
      }
      return new Response(null, { status: 404 });
    });
    const response = await POST(request({ ...valid, coverage: "INSURANCE" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ booking_id: "22222222-2222-4222-8222-222222222222", status: "REQUEST_SUBMITTED", insurance_request_id: "33333333-3333-4333-8333-333333333333", insurance_error: null });
  });
});
