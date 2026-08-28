import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { GET } from "./route";

const appointmentId = "22222222-2222-4222-8222-222222222222";
const context = { params: Promise.resolve({ appointmentId }) };
describe("consultation payment-capabilities BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("requires a valid appointment id and an authenticated session", async () => {
    expect((await GET(new Request("https://web.test"), { params: Promise.resolve({ appointmentId: "not-an-id" }) })).status).toBe(404);
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await GET(new Request("https://web.test"), context)).status).toBe(401);
  });
  it("forwards the bounded capability read and returns public capability data only", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: appointmentId, amount: 120, currency: "SAR", purpose: "consultation_card_payment", methods: [{ id: "card", kind: "online" }], internal_gateway: "must-not-leak" }), { status: 200 }));
    const response = await GET(new Request("https://web.test", { headers: { "user-agent": "test-agent" } }), context);
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ booking_id: appointmentId, amount: 120, currency: "SAR", purpose: "consultation_card_payment", methods: [{ id: "card", kind: "online" }] });
    expect(state.callPatientApi).toHaveBeenCalledWith(`/payments/consultation/${appointmentId}/capabilities`, { headers: { "user-agent": "test-agent" } }, "server-access");
  });
  it("preserves an upstream capability denial without creating a payment state", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "consultation_card_payment_not_payable" }), { status: 400 }));
    const response = await GET(new Request("https://web.test"), context);
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ message: "consultation_card_payment_not_payable" });
  });
  it("rejects a mismatched or malformed capability response", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: "33333333-3333-4333-8333-333333333333", amount: 120, currency: "SAR", purpose: "consultation_card_payment", methods: [] }), { status: 200 }));
    expect((await GET(new Request("https://web.test"), context)).status).toBe(502);
  });
});
