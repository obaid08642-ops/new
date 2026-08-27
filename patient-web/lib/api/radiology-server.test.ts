import { describe, expect, it, vi } from "vitest";
const call = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: call }));
import { getPublicRadiologyServiceDetail, getPublicRadiologyServices } from "./radiology-server";

describe("radiology public wrapper", () => {
  it("forwards a bounded detail identifier with GET and no-store", () => {
    call.mockReset();
    getPublicRadiologyServiceDetail("6a7600a27b25eeca204de283");
    expect(call).toHaveBeenCalledWith("/radiology/services/6a7600a27b25eeca204de283", { method: "GET", cache: "no-store" });
  });

  it("forwards only documented filters and never auth headers", () => {
    call.mockReset();
    getPublicRadiologyServices({ modality: "mri", bodyPart: "brain", homeVisit: "true", homeOnly: "true", highestRated: "true", lowestPrice: "true", search: "scan", nearest: "evil" });
    expect(call).toHaveBeenCalledWith(expect.stringContaining("/radiology/services?"), expect.objectContaining({ method: "GET", cache: "no-store" }));
    const path = call.mock.calls[0][0] as string; expect(path).toContain("modality=mri"); expect(path).toContain("body_part=brain"); expect(path).not.toContain("evil"); expect(call.mock.calls[0][1]).not.toHaveProperty("headers");
  });
});
