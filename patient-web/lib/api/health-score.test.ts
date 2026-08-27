import { describe, expect, it } from "vitest";
import { parseHealthScore } from "./health-score";

describe("health score parser", () => {
  it("keeps bounded score fields and drops clinical recommendations/private data", () => {
    expect(parseHealthScore({ score: 82, status: "calculated", recommendations: ["private clinical advice"], patient_id: "private", components: [{ key: "bmi", score: 82, detail: { bmi: 31.2 }, recommendation: "private" }] })).toEqual({ score: 82, status: "calculated", components: [{ key: "bmi", score: 82 }] });
  });
  it("keeps an honest insufficient-data state", () => {
    expect(parseHealthScore({ score: null, status: "insufficient_data", recommendations: ["do not expose"] })).toEqual({ score: null, status: "insufficient_data", components: [] });
  });
  it("rejects malformed payloads", () => { expect(parseHealthScore({ score: "82", status: "calculated" })).toBeNull(); });
});
