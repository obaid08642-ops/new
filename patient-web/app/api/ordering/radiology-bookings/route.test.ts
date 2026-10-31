import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ call: vi.fn(), cookies: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.call }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookies }));
import { POST } from "./route";

const body = { service_id: "scan-1", provider_id: "prov-1", scheduled_at: "2030-01-02T08:00:00.000Z", location_type: "facility", payment_method: "card" };
const req = (b: unknown = body, headers: HeadersInit = {}) => new Request("https://web.test/api/ordering/radiology-bookings", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(b) });

describe("radiology booking BFF (one scan of a radiology basket)", () => {
  beforeEach(() => { state.call.mockReset(); state.cookies.get.mockImplementation((n: string) => (n === "nabd_access" ? { value: "server-access" } : undefined)); });

  it("forwards the booking to /radiology/bookings and returns only the id, status and total", async () => {
    state.call.mockResolvedValue(new Response(JSON.stringify({ id: "rb-1", state: "NEW_REQUEST", total_price: 120, patient_phone: "private", documents: [1] }), { status: 201 }));
    const res = await POST(req());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "rb-1", status: "NEW_REQUEST", total: 120 });
    expect(state.call).toHaveBeenCalledWith("/radiology/bookings", expect.objectContaining({ method: "POST", body: JSON.stringify(body) }), "server-access");
  });

  it("refuses a payload with a price, a cash method, a bad kind or a cross-origin call, and a request without a session", async () => {
    expect((await POST(req({ ...body, payment_method: "cash" }))).status).toBe(400);
    expect((await POST(req({ ...body, location_type: "clinic" }))).status).toBe(400);
    expect((await POST(req({ ...body, service_id: "../x" }))).status).toBe(400);
    expect((await POST(req(body, { origin: "https://evil.test", host: "web.test" }))).status).toBe(403);
    expect(state.call).not.toHaveBeenCalled();
    state.cookies.get.mockReturnValue(undefined);
    expect((await POST(req())).status).toBe(401);
  });

  it("passes a server refusal through in the bounded form", async () => {
    state.call.mockResolvedValue(new Response(JSON.stringify({ message: "provider_cannot_perform_scan" }), { status: 400 }));
    const res = await POST(req());
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).toContain("provider_cannot_perform_scan");
  });
});
