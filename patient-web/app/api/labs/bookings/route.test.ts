import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { POST } from "./route";
const future = new Date(Date.now() + 60 * 60_000).toISOString();
function request(body: unknown, key = "idempotency-lab-test-123456") { return new Request("https://web.test/api/labs/bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(body) }); }

describe("lab booking BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined); });
  it("rejects missing idempotency and provider selection", async () => { expect((await POST(request({ service_id: "lab-1", provider_account_id: "p-1", scheduled_at: future }, "short"))).status).toBe(400); expect((await POST(request({ service_id: "lab-1", scheduled_at: future }))).status).toBe(400); });
  it("forwards the verified in-facility cash booking contract", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", state: "NEW_REQUEST", private: "no" }), { status: 201 }));
    const response = await POST(request({ service_id: "lab-1", provider_account_id: "provider-1", scheduled_at: future }));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ id: "11111111-1111-4111-8111-111111111111", state: "NEW_REQUEST" });
    expect(state.callPatientApi).toHaveBeenCalledWith("/labs/bookings", expect.objectContaining({ body: JSON.stringify({ items: [{ service_id: "lab-1" }], provider_account_id: "provider-1", scheduled_at: future, location_type: "facility", payment_method: "cash" }), headers: expect.objectContaining({ "idempotency-key": "idempotency-lab-test-123456" }) }), "server-access");
  });
});
