import { describe, expect, it } from "vitest";
import { extractHomeCareService, extractHomeCareServices, parseHomeCareServiceId } from "./home-care-services";

describe("home-care services parser", () => {
  it("keeps documented service display data and drops internals", () => {
    expect(extractHomeCareServices([{ id: "svc-1", name_ar: "تمريض منزلي", name_en: "Home nursing", description_ar: "وصف", price: 120, duration_value: 2, duration: "hour", insurance_availability: true, patient_id: "private" }])).toMatchObject([{ id: "svc-1", nameAr: "تمريض منزلي", nameEn: "Home nursing", descriptionAr: "وصف", price: 120, durationValue: 2, duration: "hour", insuranceAvailable: true }]);
  });
  it("does not invent malformed services and validates path identifiers", () => {
    expect(extractHomeCareService({ data: { id: "bad id", name_ar: "خدمة" } })).toBeNull();
    expect(parseHomeCareServiceId("svc-1").success).toBe(true);
    expect(parseHomeCareServiceId("patient@example.com").success).toBe(false);
  });
});
