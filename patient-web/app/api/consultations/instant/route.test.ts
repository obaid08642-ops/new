import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
vi.mock("@/lib/api/csrf", () => ({ assertSameOrigin: () => null }));

import { POST } from "./route";

const request = (body: unknown) => new Request("https://web.test/api/consultations/instant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const valid = { specialty: "cardiology", mode: "video", refund_policy_accepted: true };

describe("instant consultation BFF", () => {
  beforeEach(() => {
    state.callPatientApi.mockReset();
    state.cookieStore.get.mockImplementation((name: string) => (name === "nabd_access" ? { value: "server-access" } : undefined));
  });
  it("sends the request with the refund policy agreement on to the backend", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "r1", status: "open" }), { status: 201 }));
    expect((await POST(request(valid))).status).toBe(201);
    expect(JSON.parse(state.callPatientApi.mock.calls[0][1].body)).toEqual(valid);
  });
  it("refuses a request without the agreement, or with false, before anything is sent", async () => {
    for (const body of [{ specialty: "cardiology", mode: "video" }, { ...valid, refund_policy_accepted: false }, { ...valid, refund_policy_accepted: "true" }]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });
});
