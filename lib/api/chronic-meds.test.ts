import { describe, expect, it } from "vitest";
import { parseChronicMedications } from "./chronic-meds";
describe("chronic medication response guards", () => {
  it("keeps schedule/refill metadata and drops private/action fields", () => {
    expect(parseChronicMedications([{ id: "91047ef2-ad36-422a-a184-629693e7c729", name: "Medicine", dose: "1 tablet", frequency: "daily", times: ["08:00"], pills_remaining: 8, refill_date: "2026-08-30", days_until_refill: 9, needs_refill_soon: true, active: true, patient_id: "private", refill_action: "private", prescription_id: "private" }])).toEqual([{ id: "91047ef2-ad36-422a-a184-629693e7c729", name: "Medicine", dose: "1 tablet", frequency: "daily", times: ["08:00"], timeZone: undefined, pillsRemaining: 8, refillDate: "2026-08-30", daysUntilRefill: 9, needsRefillSoon: true, active: true }]);
  });
});
