import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ call: vi.fn(), cookies: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.call }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookies }));
import { POST } from "./route";

const id = "91047ef2-ad36-422a-a184-629693e7c729";
const context = { params: Promise.resolve({ appointmentId: id }) };

describe("outcomes-seen BFF", () => {
  beforeEach(() => {
    state.call.mockReset();
    state.cookies.get.mockImplementation((n: string) => (n === "nabd_access" ? { value: "server-access" } : undefined));
  });
  it("needs a session and a valid id", async () => {
    state.cookies.get.mockReturnValue(undefined);
    expect((await POST(new Request("https://web.test", { method: "POST" }), context)).status).toBe(401);
    expect((await POST(new Request("https://web.test", { method: "POST" }), { params: Promise.resolve({ appointmentId: "x" }) })).status).toBe(404);
  });
  it("PATCHes the outcomes seen mark upstream", async () => {
    state.call.mockResolvedValue(new Response(JSON.stringify({ ok: true, appointment_id: id, seen_at: "2026-10-30T00:00:00.000Z" }), { status: 200 }));
    const r = await POST(new Request("https://web.test", { method: "POST" }), context);
    expect(r.status).toBe(200);
    expect(state.call).toHaveBeenCalledWith(`/care/appointments/${id}/outcomes/seen`, { method: "PATCH" }, "server-access");
  });
  it("answers an upstream failure as an error", async () => {
    state.call.mockResolvedValue(new Response("{}", { status: 404 }));
    expect((await POST(new Request("https://web.test", { method: "POST" }), context)).status).toBeGreaterThanOrEqual(400);
  });
});
