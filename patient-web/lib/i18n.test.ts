import { describe, expect, it } from "vitest";
import { getDirection, isLocale, localeLabels, locales } from "./i18n";

describe("six-locale patient web core", () => {
  it("matches the six locales configured by the patient mobile source", () => {
    expect(locales).toEqual(["ar", "en", "ur", "hi", "bn", "fil"]);
    expect(Object.keys(localeLabels)).toEqual(locales);
  });

  it("uses RTL only for Arabic and Urdu", () => {
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("ur")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
    expect(getDirection("hi")).toBe("ltr");
    expect(getDirection("bn")).toBe("ltr");
    expect(getDirection("fil")).toBe("ltr");
  });

  it("accepts only explicit route locales", () => {
    expect(isLocale("fil")).toBe(true);
    expect(isLocale("tl")).toBe(false);
    expect(isLocale("fr")).toBe(false);
  });
});
