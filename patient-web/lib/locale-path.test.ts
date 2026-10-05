import { describe, expect, it } from "vitest";
import { pathInLocale } from "./locale-path";

describe("pathInLocale", () => {
  it("swaps only the locale segment and keeps the page", () => {
    expect(pathInLocale("/ar/login", "en")).toBe("/en/login");
    expect(pathInLocale("/en/notifications/settings", "ur")).toBe("/ur/notifications/settings");
    expect(pathInLocale("/ar/consultations/doctors/riyadh", "fil")).toBe("/fil/consultations/doctors/riyadh");
    expect(pathInLocale("/hi/search", "bn")).toBe("/bn/search");
  });

  it("goes to the other language's home from the home page", () => {
    expect(pathInLocale("/ar", "en")).toBe("/en");
    expect(pathInLocale("/ar/", "hi")).toBe("/hi");
  });

  it("drops a trailing slash and prefixes a path without a locale", () => {
    expect(pathInLocale("/login", "en")).toBe("/en/login");
    expect(pathInLocale("/", "ar")).toBe("/ar");
    expect(pathInLocale("/ar/otp/", "en")).toBe("/en/otp");
  });

  it("does not mistake a page that starts like a locale for one", () => {
    expect(pathInLocale("/arabic-news", "en")).toBe("/en/arabic-news");
  });
});
