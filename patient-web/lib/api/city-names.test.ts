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

  it("shows the city in each page's language: its own translation where the list has one, the English name where it has not, Arabic on the Arabic page", () => {
    expect(cityLabel("en", "الرياض", names)).toBe("Riyadh");
    expect(cityLabel("ur", "الرياض", names)).toBe("ریاض");
    expect(cityLabel("hi", "الرياض", names)).toBe("रियाद");
    expect(cityLabel("bn", "الرياض", names)).toBe("রিয়াদ");
    expect(cityLabel("fil", "الرياض", names)).toBe("Riyadh");
    expect(cityLabel("ar", "الرياض", names)).toBe("الرياض");
  });

  it("falls back for a city the list has no translation for: English on hi/bn/fil, Arabic on ur", () => {
    expect(cityLabel("hi", "جدة", names)).toBe("Jeddah");
    expect(cityLabel("bn", "جدة", names)).toBe("Jeddah");
    expect(cityLabel("fil", "جدة", names)).toBe("Jeddah");
    expect(cityLabel("ur", "جدة", names)).toBe("جدة");
  });

  it("keeps a city the list does not know, and nothing when there is none", () => {
    expect(cityLabel("en", "مدينة جديدة", names)).toBe("مدينة جديدة");
    expect(cityLabel("en", undefined, names)).toBeUndefined();
    expect(cityLabel("en", "الرياض", undefined)).toBe("الرياض");
  });
});
