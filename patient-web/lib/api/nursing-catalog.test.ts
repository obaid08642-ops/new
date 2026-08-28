import { describe, expect, it } from "vitest";
import { extractNursingCatalog } from "./nursing-catalog";

describe("nursing catalog parser", () => {
  it("keeps verified catalog fields and strips backend metadata", () => {
    expect(extractNursingCatalog([{ _id: "private", id: "svc-1", name_en: "Vital Signs", description_en: "Verified", price: 80, active: true, __v: 0, patient_id: "private" }])).toEqual([{ id: "svc-1", nameEn: "Vital Signs", descriptionEn: "Verified", price: 80, active: undefined, category: undefined, nameAr: undefined, descriptionAr: undefined, duration: undefined, durationValue: undefined, insuranceAvailable: undefined, cashAvailable: undefined }]);
  });
  it("supports data envelope and excludes inactive or malformed rows", () => {
    expect(extractNursingCatalog({ data: [{ id: "svc-2", name_ar: "تمريض", active: false }, { id: "", name_en: "bad" }, { id: "svc-3", name_en: "Care", active: true }] })).toEqual([{ id: "svc-3", category: undefined, nameAr: undefined, nameEn: "Care", descriptionAr: undefined, descriptionEn: undefined, duration: undefined, durationValue: undefined, price: undefined, insuranceAvailable: undefined, cashAvailable: undefined }]);
  });
});
