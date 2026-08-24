import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ callPatientApi: vi.fn(), cookieStore: { get: vi.fn() } }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: state.callPatientApi }));
vi.mock("next/headers", () => ({ cookies: async () => state.cookieStore }));
import { POST } from "./route";
function request(body: unknown) { return new Request("https://web.test/api/labs/match", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }

describe("lab provider match BFF", () => {
  beforeEach(() => { state.callPatientApi.mockReset(); state.cookieStore.get.mockImplementation((name: string) => name === "nabd_access" ? { value: "server-access" } : undefined); });
  it("rejects an empty service id without querying matching", async () => { expect((await POST(request({ service_id: "" }))).status).toBe(400); expect(state.callPatientApi).not.toHaveBeenCalled(); });
  it("returns a bounded provider list", async () => {
    state.callPatientApi.mockResolvedValue(new Response(JSON.stringify([{ account_id: "provider-1", display_name: "مختبر موثوق", city: "الرياض", rating_avg: 4.8, license_documents: ["private"] }]), { status: 200 }));
    const response = await POST(request({ service_id: "lab-1" }));
    expect(await response.json()).toEqual({ providers: [{ account_id: "provider-1", name: "مختبر موثوق", city: "الرياض", rating: 4.8 }] });
    expect(state.callPatientApi).toHaveBeenCalledWith("/workflow/match", expect.objectContaining({ body: JSON.stringify({ kind: "lab", service_ids: ["lab-1"], max_results: 12 }) }), "server-access");
  });
});
