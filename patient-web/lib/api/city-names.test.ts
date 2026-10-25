import { describe, expect, it } from "vitest";
import { cityLabel, extractCityNames } from "./city-names";

const names = extractCityNames([
  { name_ar: "الرياض", name_en: "Riyadh", name_ur: "ریاض", name_hi: "रियाद", name_bn: "রিয়াদ", name_tl: "Riyadh", is_active: true },
  { name_ar: "جدة", name_en: "Jeddah" },
  { name_ar: "مخفية", name_en: "Hidden", is_deleted: true },
  { name_ar: "بلا", name_en: "" },
]);

describe("city names", () => {
  it("maps the Arabic name to the English one and skips deleted or half rows", () => {
    expect(Object.keys(names)).toEqual(["الرياض", "جدة"]);
    expect(Object.keys(extractCityNames({ data: [{ name_ar: "أبها", name_en: "Abha" }] }))).toEqual(["أبها"]);
    expect(extractCityNames(null)).toEqual({});
  });

  it("shows Arabic on the Arabic page and the English name on every other page (Urdu, Hindi, Bengali and Filipino included)", () => {
    expect(cityLabel("ar", "الرياض", names)).toBe("الرياض");
    for (const locale of ["en", "ur", "hi", "bn", "fil"]) {
      expect(cityLabel(locale, "الرياض", names)).toBe("Riyadh");
      expect(cityLabel(locale, "جدة", names)).toBe("Jeddah");
    }
  });

  it("keeps a city the list does not know, and nothing when there is none", () => {
    expect(cityLabel("en", "مدينة جديدة", names)).toBe("مدينة جديدة");
    expect(cityLabel("en", undefined, names)).toBeUndefined();
    expect(cityLabel("en", "الرياض", undefined)).toBe("الرياض");
  });
});
