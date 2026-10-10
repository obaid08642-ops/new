import { beforeEach, describe, expect, it, vi } from "vitest";

const callPatientApi = vi.fn();
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: (...args: unknown[]) => callPatientApi(...args) }));

import { GET } from "./route";

const answer = (slug: string | null, status = 200) =>
  new Response(JSON.stringify({ medicine_id: "m", requires_prescription: true, specialty: slug ? { slug, name_ar: "x", name_en: "x" } : null, source: slug ? "category" : null }), { status });
const call = (ids: string) => GET(new Request(`https://nabd.test/api/rx-consult?ids=${encodeURIComponent(ids)}`));

describe("GET /api/rx-consult", () => {
  beforeEach(() => callPatientApi.mockReset());

  it("answers the specialty every prescription line agrees on, asking the public endpoint without a session", async () => {
    callPatientApi.mockResolvedValue(answer("internal_medicine"));
    const response = await call("m1,m2");
    expect(await response.json()).toEqual({ specialty: "internal_medicine" });
    expect(callPatientApi).toHaveBeenCalledTimes(2);
    expect(callPatientApi).toHaveBeenCalledWith("/medicines/m1/consult-specialty");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers no specialty when the lines disagree, when none is mapped or when a read failed", async () => {
    callPatientApi.mockResolvedValueOnce(answer("pediatrics")).mockResolvedValueOnce(answer("cardiology"));
    expect(await (await call("m1,m2")).json()).toEqual({ specialty: null });
    callPatientApi.mockResolvedValue(answer(null));
    expect(await (await call("m1")).json()).toEqual({ specialty: null });
    callPatientApi.mockResolvedValue(new Response(null, { status: 503 }));
    expect(await (await call("m1")).json()).toEqual({ specialty: null });
  });

  it("keeps a failed line from hiding the suggestion of the others", async () => {
    callPatientApi.mockResolvedValueOnce(new Response(null, { status: 503 })).mockResolvedValueOnce(answer("dermatology"));
    expect(await (await call("m1,m2")).json()).toEqual({ specialty: "dermatology" });
  });

  it("takes ids only: nothing else is forwarded", async () => {
    expect(await (await call("../etc,%20,a b")).json()).toEqual({ specialty: null });
    expect(callPatientApi).not.toHaveBeenCalled();
  });
});
