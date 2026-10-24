import { describe, expect, it } from "vitest";
import { cityLabel, extractCityNames } from "./city-names";

const names = extractCityNames([
  { name_ar: "الرياض", name_en: "Riyadh", is_active: true },
  { name_ar: "جدة", name_en: "Jeddah" },
  { name_ar: "مخفية", name_en: "Hidden", is_deleted: true },
  { name_ar: "بلا", name_en: "" },
]);

describe("city names", () => {
  it("maps the Arabic name to the English one and skips deleted or half rows", () => {
    expect(names).toEqual({ "الرياض": "Riyadh", "جدة": "Jeddah" });
    expect(extractCityNames({ data: [{ name_ar: "أبها", name_en: "Abha" }] })).toEqual({ "أبها": "Abha" });
    expect(extractCityNames(null)).toEqual({});
  });

  it("shows the English name on English, Hindi, Bengali and Filipino pages, the Arabic on Arabic and Urdu", () => {
    for (const locale of ["en", "hi", "bn", "fil"]) expect(cityLabel(locale, "الرياض", names)).toBe("Riyadh");
    for (const locale of ["ar", "ur"]) expect(cityLabel(locale, "الرياض", names)).toBe("الرياض");
  });

  it("keeps a city the list does not know, and nothing when there is none", () => {
    expect(cityLabel("en", "مدينة جديدة", names)).toBe("مدينة جديدة");
    expect(cityLabel("en", undefined, names)).toBeUndefined();
    expect(cityLabel("en", "الرياض", undefined)).toBe("الرياض");
  });
});
