import { describe, expect, it } from "vitest";
import { extractRadiologyServices, parseRadiologyServiceId } from "./radiology";

describe("radiology parser", () => {
  it("maps the live service shape and strips internal fields", () => {
    const [service] = extractRadiologyServices([{ _id: "6a7600a27b25eeca204de283", name_en: "Chest X-Ray", name_ar: "أشعة سينية - صدر", modality: "xray", body_part: "chest", price: 90, popularity: 95, patient_id: "private", booking_url: "must-not-leak" }]);
    expect(service).toMatchObject({ id: "6a7600a27b25eeca204de283", nameEn: "Chest X-Ray", modality: "xray", bodyPart: "chest", price: 90 });
    expect(service).not.toHaveProperty("patient_id"); expect(service).not.toHaveProperty("booking_url");
  });
  it("accepts only bounded public identifiers", () => { expect(parseRadiologyServiceId("6a7600a27b25eeca204de283").success).toBe(true); expect(parseRadiologyServiceId("https://evil.test").success).toBe(false); });
});
