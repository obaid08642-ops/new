import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ call: vi.fn(), cookies: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.call }));
vi.mock("@/lib/api/addresses-server", () => ({ getPatientAddresses: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookies }));

import { POST } from "./route";

const future = new Date(Date.now() + 3 * 24 * 3600_000).toISOString();
const request = (body: unknown) => new Request("https://web.test/api/nursing/bookings", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "k".repeat(20) }, body: JSON.stringify(body) });
const valid = { provider_id: "nurse-1", service_id: "svc-wound", scheduled_at: future, location: { lat: 24.7, lng: 46.7 }, payment_method: "card", refund_policy_accepted: true };

describe("nursing booking BFF", () => {
  beforeEach(() => {
    state.call.mockReset();
    state.cookies.get.mockImplementation((name: string) => (name === "nabd_access" ? { value: "server-access" } : undefined));
  });
  it("sends the refund policy agreement on to the backend", async () => {
    state.call.mockResolvedValue(new Response(JSON.stringify({ id: "b1" }), { status: 201 }));
    expect((await POST(request(valid))).status).toBe(201);
    expect(JSON.parse(state.call.mock.calls[0][1].body)).toMatchObject({ refund_policy_accepted: true, payment_method: "card" });
  });
  it("refuses a booking without the agreement, or with false, before anything is sent", async () => {
    const { refund_policy_accepted: _agreed, ...without } = valid;
    for (const body of [without, { ...valid, refund_policy_accepted: false }]) expect((await POST(request(body))).status).toBe(400);
    expect(state.call).not.toHaveBeenCalled();
  });
});
