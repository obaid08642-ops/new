import { describe, expect, it } from "vitest";
import { extractSpecialties } from "./specialties";

describe("specialties parser", () => {
  it("accepts array/data/items and keeps only documented display fields", () => {
    expect(extractSpecialties({ data: [{ slug: "cardiology", name_ar: "قلب", name_en: "Cardiology", count: 4, patient_id: "secret" }, { name_ar: "" }] })).toEqual([{ slug: "cardiology", nameAr: "قلب", nameEn: "Cardiology", count: 4 }]);
  });

  it("returns no fabricated specialties for malformed or empty payloads", () => {
    expect(extractSpecialties({ data: [{ patient_id: "secret" }, null], extra: "ignored" })).toEqual([]);
    expect(extractSpecialties(null)).toEqual([]);
  });
});
