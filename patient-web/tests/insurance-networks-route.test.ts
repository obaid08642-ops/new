import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ api: vi.fn(), token: { value: "t" as string | undefined } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (mocks.token.value ? { value: mocks.token.value } : undefined) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: mocks.api }));

import { GET } from "@/app/api/insurance/networks/route";
import { POST } from "@/app/api/insurance/policy/route";
import { parseNetworks } from "@/lib/insurance/view";

beforeEach(() => { mocks.api.mockReset(); mocks.token.value = "t"; });

describe("insurance networks for the add-policy form", () => {
  it("reads the insurer's networks as code and name", async () => {
    mocks.api.mockResolvedValue(new Response(JSON.stringify({ data: [{ code: "N1", name_ar: "شبكة", name_en: "Net" }, { id: "n2", name_en: "Second" }, { name_en: "no code" }] })));
    const res = await GET(new Request("http://x/api/insurance/networks?company_id=bupa"));
    expect(mocks.api).toHaveBeenCalledWith("/insurance/companies/bupa/networks", {}, "t");
    expect(await res.json()).toEqual({ networks: [{ code: "N1", name: "شبكة" }, { code: "n2", name: "Second" }] });
    expect(parseNetworks(null)).toEqual([]);
  });
  it("refuses a bad company or no session without calling the server", async () => {
    expect((await GET(new Request("http://x/api/insurance/networks?company_id=../x"))).status).toBe(400);
    mocks.token.value = undefined;
    expect((await GET(new Request("http://x/api/insurance/networks?company_id=bupa"))).status).toBe(401);
    expect(mocks.api).not.toHaveBeenCalled();
  });
  it("sends the chosen network with the policy", async () => {
    mocks.api.mockResolvedValue(new Response("{}"));
    await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ company_id: "bupa", policy_number: "P-123", network: "N1" }) }));
    expect(JSON.parse(mocks.api.mock.calls[0][1].body)).toMatchObject({ company_id: "bupa", network: "N1" });
  });
});
