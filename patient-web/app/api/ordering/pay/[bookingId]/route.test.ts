import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ call: vi.fn(), cookies: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.call }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookies }));
import { POST } from "./route";

const ctx = { params: Promise.resolve({ bookingId: "rb-1" }) };
const req = (query = "") => new Request(`https://web.test/api/ordering/pay/rb-1${query}`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "web-ord-pay-rb-1-1-0000" }, body: "{}" });

describe("ordering pay BFF: the payment kind of the booking", () => {
  beforeEach(() => {
    state.call.mockReset();
    state.cookies.get.mockImplementation((n: string) => (n === "nabd_access" ? { value: "server-access" } : undefined));
    state.call.mockResolvedValue(new Response(JSON.stringify({ checkout_url: "https://pay.example/c/1", status: "pending" }), { status: 201 }));
  });

  it("pays a lab booking on the lab kind by default", async () => {
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    expect(state.call.mock.calls[0][0]).toBe("/payments/intent/lab/rb-1");
  });

  it("pays a radiology booking on the radiology kind; any other kind falls back to the lab kind", async () => {
    await POST(req("?kind=radiology"), ctx);
    expect(state.call.mock.calls[0][0]).toBe("/payments/intent/radiology/rb-1");
    await POST(req("?kind=pharmacy"), ctx);
    expect(state.call.mock.calls[1][0]).toBe("/payments/intent/lab/rb-1");
  });
});
