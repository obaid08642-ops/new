import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { POST } from "./route";

function request(body: unknown, key = "idempotency-radiology-test-123456") { return new Request("https://web.test/api/radiology/bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(body) }); }
const future = new Date(Date.now() + 60 * 60_000).toISOString();

describe("radiology booking BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined); });
  it("rejects missing idempotency and non-future appointment values", async () => {
    expect((await POST(request({ service_id: "rad-1", scheduled_at: future }, "short"))).status).toBe(400);
    expect((await POST(request({ service_id: "rad-1", scheduled_at: "invalid" }))).status).toBe(400);
  });
  it("forwards only service, future time, and in-center mode", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", status: "PENDING_ACCEPTANCE", hidden: "no" }), { status: 201 }));
    const response = await POST(request({ service_id: "rad-1", scheduled_at: future, provider_account_id: "must-not-pass" }));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ id: "11111111-1111-4111-8111-111111111111", status: "PENDING_ACCEPTANCE" });
    expect(state.callPatientApi).toHaveBeenCalledWith("/radiology/bookings", expect.objectContaining({ body: JSON.stringify({ service_id: "rad-1", scheduled_at: future, delivery_mode: "IN_CENTER" }), headers: expect.objectContaining({ "idempotency-key": "idempotency-radiology-test-123456" }) }), "server-access");
  });
});
