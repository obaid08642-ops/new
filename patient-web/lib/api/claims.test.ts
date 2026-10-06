import { describe, expect, it } from "vitest";
import { parseClaims } from "./claims";

describe("insurance claim response guards", () => {
  it("keeps only patient-safe claim summary fields", () => {
    expect(parseClaims({ data: [{ id: "claim-1", service: "Lab", status: "approved", date: "2026-08-20", patient_id: "private", amount: 500, covered: 400, documents: [{ url: "private" }] }] })).toEqual([{ id: "claim-1", service: "Lab", status: "approved", date: "2026-08-20" }]);
  });

  it("drops malformed rows", () => {
    expect(parseClaims([{ id: "", service: "Lab" }, { id: "claim-2", status: "unknown" }])).toEqual([]);
  });
});
