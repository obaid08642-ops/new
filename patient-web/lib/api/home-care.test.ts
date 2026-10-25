import { describe, expect, it } from "vitest";
import { extractHomeCareBookings } from "./home-care";

const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("home-care response guards", () => {
  it("keeps only booking service, state, and schedule fields", () => {
    const rows = extractHomeCareBookings({ data: [{ id: bookingId, service_name_ar: "Service", state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", sessions_count: 2, duration: "hour", patient_name: "private", address: { address: "private" }, clinical_notes: "private", total_price: 500 }] });
    expect(rows).toEqual([{ id: bookingId, serviceNameAr: "Service", serviceNameEn: undefined, serviceNames: { ar: "Service" }, state: "CONFIRMED", scheduledAt: "2026-08-20T10:00:00.000Z", sessionsCount: 2, duration: "hour" }]);
  });
});

describe("home-care booking service names, Arabic and English (issue 1832, owner decision 2026-10-25)", () => {
  it("reads service_names over the stored Arabic/English; an old booking keeps the stored pair", async () => {
    const { pickName } = await import("@/lib/i18n/localized");
    const [fresh, old] = extractHomeCareBookings({ data: [
      { id: bookingId, service_name_ar: "قديم", service_name_en: "old", service_names: { ar: "جروح", en: "Wound care", tl: "Sugat", hi: "घाव" } },
      { id: "11111111-2222-4333-8444-555555555555", service_name_ar: "قديم", service_name_en: "old" },
    ] });
    expect(["ar", "en", "hi", "fil", "bn"].map((l) => pickName(l, fresh.serviceNames))).toEqual(["جروح", "Wound care", "Wound care", "Wound care", "Wound care"]);
    expect(old.serviceNames).toEqual({ ar: "قديم", en: "old" });
    expect(pickName("ur", old.serviceNames)).toBe("old");
  });
});
