import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { POST } from "./route";

const txn = "91047ef2-ad36-422a-a184-629693e7c729";
const order = "761e9693-e517-4ad6-ae20-330363005b28";
const context = { params: Promise.resolve({ txn }) };
const request = (headers: HeadersInit = {}) => new Request("https://web.test/api/payments/verify/x", { method: "POST", headers });

describe("payment verification BFF (what the result screen asks the backend)", () => {
  beforeEach(() => {
    state.callPatientApi.mockReset();
    state.cookieStore.get.mockImplementation((name: string) => (name === "nabd_access" ? { value: "server-access" } : undefined));
  });

  it("needs a transaction id, a session and a same-origin caller", async () => {
    expect((await POST(request(), { params: Promise.resolve({ txn: "../../x" }) })).status).toBe(404);
    expect((await POST(request({ origin: "https://evil.test", host: "web.test" }), context)).status).toBe(403);
    state.cookieStore.get.mockReturnValue(undefined);
    expect((await POST(request(), context)).status).toBe(401);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });

  it("asks the backend's verify route with the server-held token and returns only the bounded fields (the document holds provider secrets)", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({
      id: txn, status: "paid", booking_kind: "pharmacy", booking_id: order, patient_id: "private-patient", client_secret: "private-secret",
      gateway_intent_id: "private-intent", webhook_payload: { source: { number: "4111" } }, amount: 18.5,
    }), { status: 201 }));
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ transactionId: txn, status: "paid", bookingKind: "pharmacy", bookingId: order });
    expect(state.callPatientApi).toHaveBeenCalledWith(`/payments/verify/${txn}`, expect.objectContaining({ method: "POST" }), "server-access");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("passes the backend's refusal on as a bounded error, and never invents a status", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "not_authorized", stack: "private" }), { status: 400 }));
    const refused = await POST(request(), context);
    expect(refused.status).toBe(400);
    expect(await refused.json()).toEqual({ message: "not_authorized" });
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: txn }), { status: 201 }));
    expect((await POST(request(), context)).status).toBe(502);
    state.callPatientApi.mockResolvedValue(new Response(null, { status: 503 }));
    expect((await POST(request(), context)).status).toBe(503);
  });
});
