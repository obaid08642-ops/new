import { describe, expect, it, vi } from "vitest";
const call = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/upstream", () => ({ callPatientApi: call }));
import { getPublicRadiologyServices } from "./radiology-server";

describe("radiology public wrapper", () => {
  it("forwards only documented filters and never auth headers", () => {
    getPublicRadiologyServices({ modality: "mri", bodyPart: "brain", homeVisit: "true", homeOnly: "true", highestRated: "true", lowestPrice: "true", search: "scan", nearest: "evil" });
    expect(call).toHaveBeenCalledWith(expect.stringContaining("/radiology/services?"), expect.objectContaining({ method: "GET", cache: "no-store" }));
    const path = call.mock.calls[0][0] as string; expect(path).toContain("modality=mri"); expect(path).toContain("body_part=brain"); expect(path).not.toContain("evil"); expect(call.mock.calls[0][1]).not.toHaveProperty("headers");
  });
});
