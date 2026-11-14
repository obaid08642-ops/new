import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "t" }) }) }));
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: mocks.api }));

import { parseReportShares } from "@/lib/consult/report-share";
import { GET, POST } from "@/app/api/medical-reports/[reportId]/share/route";
import { DELETE } from "@/app/api/medical-reports/[reportId]/share/[doctorId]/route";
import { GET as search } from "@/app/api/medical-reports/doctor-search/route";

beforeEach(() => mocks.api.mockReset());
const ctx = (p: Record<string, string>) => ({ params: Promise.resolve(p) }) as never;

describe("sharing a report with a doctor", () => {
  it("lists only the doctors the report is still shared with", () => {
    const shares = parseReportShares({ data: { shared_with_doctor_ids: ["d1", "d3"], share_history: [{ doctor_id: "d1", doctor_name: " Dr A " }, { doctor_id: "d2", doctor_name: "Gone" }] } });
    expect(shares).toEqual([{ doctorId: "d1", doctorName: "Dr A" }, { doctorId: "d3" }]);
    expect(parseReportShares(null)).toEqual([]);
  });
  it("reads, shares and revokes through the report's endpoints", async () => {
    mocks.api.mockResolvedValueOnce(new Response(JSON.stringify({ shared_with_doctor_ids: ["d1"], share_history: [{ doctor_id: "d1" }] })));
    expect(await (await GET(new Request("http://x"), ctx({ reportId: "r1" }))).json()).toEqual({ shares: [{ doctorId: "d1" }] });
    mocks.api.mockResolvedValueOnce(new Response("{}"));
    const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ doctor_profile_id: "d1", doctor_name: "Dr A" }) }), ctx({ reportId: "r1" }));
    expect(res.status).toBe(200);
    expect(mocks.api).toHaveBeenLastCalledWith("/medical-reports/r1/share", expect.objectContaining({ method: "POST", body: JSON.stringify({ doctor_profile_id: "d1", doctor_name: "Dr A" }) }), "t");
    mocks.api.mockResolvedValueOnce(new Response("{}"));
    await DELETE(new Request("http://x", { method: "DELETE" }), ctx({ reportId: "r1", doctorId: "d1" }));
    expect(mocks.api).toHaveBeenLastCalledWith("/medical-reports/r1/share/d1", { method: "DELETE" }, "t");
  });
  it("refuses bad ids and short searches without calling the server", async () => {
    expect((await POST(new Request("http://x", { method: "POST", body: JSON.stringify({ doctor_profile_id: "../x" }) }), ctx({ reportId: "r1" }))).status).toBe(400);
    expect(await (await search(new Request("http://x/?q=a"))).json()).toEqual({ doctors: [] });
    expect(mocks.api).not.toHaveBeenCalled();
  });
});
