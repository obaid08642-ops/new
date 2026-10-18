// Rule 6 (owner, 2026-10-06): the website language follows the device, reading every preferred language in order.
import { describe, expect, it } from "vitest";
import { chooseLocale, deviceLocale } from "../lib/i18n/device-locale";

describe("deviceLocale", () => {
  it("takes the first preferred language the site has, not only the first entry", () => {
    expect(deviceLocale("de-DE,ur;q=0.8,en;q=0.5")).toBe("ur");
    expect(deviceLocale("fr-FR,en-GB;q=0.7")).toBe("en");
  });

  it("orders by quality, so q=0.9 beats a listed-first q=0.5", () => {
    expect(deviceLocale("hi;q=0.5,bn;q=0.9")).toBe("bn");
  });

  it("maps Tagalog to Filipino and uses the primary subtag", () => {
    expect(deviceLocale("tl-PH")).toBe("fil");
    expect(deviceLocale("ar-SA")).toBe("ar");
  });

  it("gives English when the device lists languages but none is supported", () => {
    expect(deviceLocale("fr-FR,de;q=0.8")).toBe("en");
  });

  it("gives no answer when the request names no language (crawlers, *, quality 0)", () => {
    expect(deviceLocale(null)).toBeNull();
    expect(deviceLocale("")).toBeNull();
    expect(deviceLocale("*")).toBeNull();
    expect(deviceLocale("ur;q=0")).toBeNull();
  });
});

describe("chooseLocale", () => {
  it("keeps the user's remembered choice over the device", () => {
    expect(chooseLocale("hi", "ar-SA,en;q=0.5")).toBe("hi");
  });

  it("ignores a cookie that is not a site locale", () => {
    expect(chooseLocale("xx", "ur")).toBe("ur");
  });

  it("falls back to Arabic when neither the cookie nor the device says anything", () => {
    expect(chooseLocale(undefined, null)).toBe("ar");
    expect(chooseLocale(undefined, "*")).toBe("ar");
  });
});
