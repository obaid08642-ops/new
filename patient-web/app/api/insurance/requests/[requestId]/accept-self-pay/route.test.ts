import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi })); vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { POST } from "./route";
const id = "33333333-3333-4333-8333-333333333333"; const context = { params: Promise.resolve({ requestId: id }) };
function request(headers: HeadersInit = {}) { return new Request("https://web.test", { method: "POST", headers: { "idempotency-key": "self-pay-key-123456", ...headers } }); }
describe("self-pay acceptance BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("requires idempotency and an authenticated session", async () => { expect((await POST(request({ "idempotency-key": "short" }), context)).status).toBe(400); state.cookieStore.get.mockReturnValue(undefined); expect((await POST(request(), context)).status).toBe(401); });
  it("forwards an idempotent server action and accepts only SELF_PAY_PENDING", async () => { state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id, state: "SELF_PAY_PENDING", self_pay_amount: 250, patient_id: "private" }))); const response = await POST(request(), context); expect(response.status).toBe(200); expect(await response.json()).toEqual({ id, state: "SELF_PAY_PENDING", selfPayAmount: 250 }); expect(state.callPatientApi).toHaveBeenCalledWith(`/insurance/requests/${id}/accept-self-pay`, { method: "POST", headers: { "idempotency-key": "self-pay-key-123456" } }, "server-access"); });
  it("rejects a response which does not prove the server accepted self-pay", async () => { state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id, state: "REJECTED" }))); expect((await POST(request(), context)).status).toBe(502); });
});
