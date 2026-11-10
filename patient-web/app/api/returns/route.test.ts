import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "nabd_access" ? { value: "test-token" } : undefined) }) }));
vi.mock("@/lib/auth/cookies", () => ({ authCookieNames: { access: "nabd_access", refresh: "nabd_refresh", device: "nabd_device" } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));

import { POST } from "./route";

const post = (body: unknown) => POST(new Request("http://localhost/api/returns", { method: "POST", body: JSON.stringify(body) }));
beforeEach(() => state.callPatientApi.mockReset());

describe("POST /api/returns", () => {
  it("forwards a pharmacy return with its defect reason code and photo references", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ id: "r1" }), { status: 201 }));
    const res = await post({ serviceType: "pharmacy", reason: "Damaged medicine", orderId: "o1", reason_code: "damaged", attachedDocs: ["media:abc123"] });
    expect(res.status).toBe(200);
    const [path, init] = state.callPatientApi.mock.calls[0];
    expect(path).toBe("/pharmacy/returns");
    expect(JSON.parse(init.body)).toMatchObject({ reason_code: "damaged", attachedDocs: ["media:abc123"] });
  });
  it("refuses a reason code that is not one of the four and a photo that is not an uploaded media reference", async () => {
    expect((await post({ serviceType: "pharmacy", reason: "x", orderId: "o1", reason_code: "changed_mind" })).status).toBe(400);
    expect((await post({ serviceType: "pharmacy", reason: "x", orderId: "o1", reason_code: "damaged", attachedDocs: ["https://example.test/a.jpg"] })).status).toBe(400);
    expect(state.callPatientApi).not.toHaveBeenCalled();
  });
  it("passes the server's refusal text to the form", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "photo_evidence_required" }), { status: 400 }));
    const res = await post({ serviceType: "pharmacy", reason: "x", orderId: "o1", reason_code: "damaged", attachedDocs: ["media:abc123"] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "photo_evidence_required" });
  });
});
