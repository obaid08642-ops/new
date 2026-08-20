import { describe, expect, it } from "vitest";
import { extractMedicationReminderSummaries } from "./reminders";

const reminderId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("medication reminder response guards", () => {
  it("keeps name, dose, valid times, and frequency only", () => {
    const reminders = extractMedicationReminderSummaries({ reminders: [{ id: reminderId, medicine_name_ar: "Medicine", dose: "1 tablet", times: ["08:00", "invalid"], frequency: "daily", today_doses: [{ time_key: "08:00", status: "taken" }, { time_key: "99:99", status: "pending" }, { time_key: "09:00", status: "unknown" }], patient_id: "private", instructions_ar: "private", log: [{ status: "taken" }], refill_pending_order_id: "private" }] });
    expect(reminders).toEqual([{ id: reminderId, medicineName: "Medicine", dose: "1 tablet", times: ["08:00"], frequency: "daily", todayDoses: [{ timeKey: "08:00", status: "taken" }] }]);
  });
});
