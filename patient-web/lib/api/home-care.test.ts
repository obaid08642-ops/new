import { describe, expect, it } from "vitest";
import { extractHomeCareBookings } from "./home-care";

const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("home-care response guards", () => {
  it("keeps only booking service, state, and schedule fields", () => {
    const rows = extractHomeCareBookings({ data: [{ id: bookingId, service_name_ar: "Service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, duration: "hour", patient_name: "private", address: { address: "private" }, clinical_notes: "private", total_price: 500 }] });
    expect(rows).toEqual([{ id: bookingId, serviceNameAr: "Service", serviceNameEn: undefined, state: "CONFIRMED", scheduledAt: "2026-08-20T10:00:00.000Z", sessionsCount: 2, duration: "hour" }]);
  });
});
