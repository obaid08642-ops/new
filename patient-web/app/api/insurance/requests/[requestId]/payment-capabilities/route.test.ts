import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi })); vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { GET } from "./route";
const id = "33333333-3333-4333-8333-333333333333"; const context = { params: Promise.resolve({ requestId: id }) };
describe("insurance payment-capabilities BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("requires a valid owned session and explicit payment mode", async () => { expect((await GET(new Request("https://web.test"), context)).status).toBe(400); state.cookieStore.get.mockReturnValue(undefined); expect((await GET(new Request("https://web.test?mode=copay"), context)).status).toBe(401); });
  it("forwards the co-pay capability request and strips internal fields", async () => { state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: id, amount: 75, currency: "SAR", purpose: "insurance_copay", methods: [{ id: "card", kind: "online" }], internal_gateway: "private" }))); const response = await GET(new Request("https://web.test?mode=copay"), context); expect(response.status).toBe(200); expect(await response.json()).toEqual({ booking_id: id, amount: 75, currency: "SAR", purpose: "insurance_copay", methods: [{ id: "card", kind: "online" }] }); expect(state.callPatientApi).toHaveBeenCalledWith(`/payments/insurance/${id}/capabilities`, { headers: undefined }, "server-access"); });
  it("rejects a capability response whose purpose does not match the current request state", async () => { state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ booking_id: id, amount: 75, currency: "SAR", purpose: "insurance_self_pay", methods: [] }))); expect((await GET(new Request("https://web.test?mode=copay"), context)).status).toBe(502); });
});
