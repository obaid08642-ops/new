import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { POST } from "./route";
const future = new Date(Date.now() + 60 * 60_000).toISOString();
function request(body: unknown, key = "idempotency-home-care-test-123456") { return new Request("https://web.test/api/home-care/bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(body) }); }
const payload = { service_id: "care-1", provider_id: "nurse-1", scheduled_at: future, address: { address: "عنوان موثوق", lat: 24, lng: 46 }, sessions_count: 2, payment_method: "cash" };

describe("home-care booking BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : name === "nabd_device" ? { value: "device-1" } : undefined); });
  it("rejects missing idempotency and invalid address payloads", async () => { expect((await POST(request(payload, "short"))).status).toBe(400); expect((await POST(request({ ...payload, address: {} }))).status).toBe(400); });
  it("forwards only a verified cash booking", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", state: "PROVIDER_ASSIGNED", internal: "no" }), { status: 201 }));
    const response = await POST(request(payload));
    expect(response.status).toBe(201); expect(await response.json()).toEqual({ id: "11111111-1111-4111-8111-111111111111", state: "PROVIDER_ASSIGNED" });
    expect(state.callPatientApi).toHaveBeenCalledWith("/home-care/bookings", expect.objectContaining({ body: JSON.stringify(payload), headers: expect.objectContaining({ "idempotency-key": "idempotency-home-care-test-123456" }) }), "server-access");
  });
});
