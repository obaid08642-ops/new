import { describe, expect, it } from "vitest";
import { parseHealthTrends } from "./trends";
describe("health trends response guards", () => {
  it("keeps recorded series and drops normal ranges/private fields", () => {
    expect(parseHealthTrends([{ id: "glucose", name: "Glucose", unit: "mg/dL", normal: [70, 140], current: 100, trendDir: "flat", labels: ["08-20"], data: [{ value: 100, at: "2026-08-20T08:00:00.000Z" }], patient_id: "private" }])).toEqual([{ id: "glucose", name: "Glucose", unit: "mg/dL", current: 100, trendDir: "flat", labels: ["08-20"], data: [{ value: 100, at: "2026-08-20T08:00:00.000Z" }] }]);
  });
});
