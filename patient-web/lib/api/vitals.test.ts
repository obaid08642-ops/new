import { describe, expect, it } from "vitest";
import { extractVitalSummary } from "./vitals";

describe("vital summary response guards", () => {
  it("allows known key, measurement, unit, and timestamp only", () => {
    const summary = extractVitalSummary([{ key: "heart_rate", value: "72", unit: "bpm", measured_at: "2026-08-20T10:00:00.000Z", patient_id: "private", source: "device", notes: "private" }]);
    expect(summary).toEqual([{ key: "heart_rate", value: "72", unit: "bpm", measuredAt: "2026-08-20T10:00:00.000Z" }]);
  });

  it("drops unknown vital keys and absent values", () => {
    expect(extractVitalSummary([{ key: "unknown", value: "1" }, { key: "bp" }])).toEqual([]);
  });
});
