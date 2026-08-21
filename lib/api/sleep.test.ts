import { describe, expect, it } from "vitest";
import { parseSleepReadings } from "./sleep";
describe("sleep response guards", () => {
  it("keeps persisted metrics and drops private fields", () => {
    expect(parseSleepReadings([{ id: "s1", sleep_score: 82, duration_hours: 7.5, measured_at: "2026-08-20T07:00:00.000Z", source: "device", patient_id: "private", notes: "private", device_id: "private" }])).toEqual([{ id: "s1", score: "82", durationHours: "7.5", measuredAt: "2026-08-20T07:00:00.000Z", source: "device" }]);
  });
});
