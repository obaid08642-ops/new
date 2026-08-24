import { describe, expect, it } from "vitest";
import { parseBreathingHistory } from "./breathing";
describe("breathing history response guards", () => {
  it("keeps session metadata and drops patient/private fields", () => {
    expect(parseBreathingHistory([{ id: "s1", patient_id: "private", technique: "box", rounds: 4, duration_seconds: 120, logged_at: "2026-08-20T10:00:00.000Z", notes: "private" }])).toEqual([{ id: "s1", technique: "box", rounds: 4, durationSeconds: 120, loggedAt: "2026-08-20T10:00:00.000Z" }]);
  });
});
