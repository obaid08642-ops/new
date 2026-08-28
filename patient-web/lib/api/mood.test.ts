import { describe, expect, it } from "vitest";
import { parseMoodHistory } from "./mood";
describe("mood history response guards", () => {
  it("keeps self-reported scales and drops notes/tags/private fields", () => {
    expect(parseMoodHistory([{ id: "m1", patient_id: "private", mood: "good", energy_level: 4, stress_level: 2, sleep_hours: 7, logged_at: "2026-08-20T10:00:00.000Z", notes: "private", tags: ["private"] }])).toEqual([{ id: "m1", mood: "good", energy: 4, stress: 2, sleepHours: 7, loggedAt: "2026-08-20T10:00:00.000Z" }]);
  });
});
