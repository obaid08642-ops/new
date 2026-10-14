import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ cookie: undefined as string | undefined, callPatientApi: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));

import { GET } from "./route";

const call = (id: string) => GET(new Request("http://x/api/nursing/files/" + id), { params: Promise.resolve({ storageId: id }) });

describe("GET /api/nursing/files/:storageId (N1 nurse result file)", () => {
  beforeEach(() => { state.cookie = "live"; state.callPatientApi.mockReset(); });

  it("redirects to the signed URL the backend returns", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ url: "https://files.example/signed?x=1", expires_in: 300 }), { status: 200 }));
    const res = await call("f1");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://files.example/signed?x=1");
    expect(state.callPatientApi.mock.calls[0][0]).toBe("/storage/f1/signed-url");
  });

  it("needs a session and a well-formed id, and never follows a non-https url", async () => {
    state.cookie = undefined;
    expect((await call("f1")).status).toBe(401);
    state.cookie = "live";
    expect((await call("../etc")).status).toBe(400);
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ url: "http://insecure.example/x" }), { status: 200 }));
    expect((await call("f1")).status).toBe(502);
  });

  it("passes the backend refusal through (a file not shared with this patient)", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }));
    expect((await call("f2")).status).toBe(403);
  });
});
