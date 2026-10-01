import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_PREFERENCE_KEY,
  isSupportedLocale,
  negotiateLocale,
  readLocalePreference,
  resolveLocale,
  writeLocalePreference,
} from "@/lib/locale-negotiation";
import { locales } from "@/lib/i18n";

/**
 * 12.A4's Verify: "Tests for each of the 6 device languages and an unsupported
 * one."
 *
 * The unsupported case is the one that matters. Today `/` sends everyone to `/ar`,
 * so the six supported cases all appear to pass — the code has no branch that
 * could fail. The defect is only visible for a device it does not know, and only
 * for a device it should have known. Both are tested here.
 */
describe("12.A4 — locale negotiation", () => {
  it("supports exactly the six locales the plan names", () => {
    expect([...locales].sort()).toEqual(["ar", "bn", "en", "fil", "hi", "ur"]);
    for (const l of locales) expect(isSupportedLocale(l)).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });

  describe("each of the six device languages", () => {
    for (const locale of locales) {
      it(`${locale}: a device set to ${locale} lands on ${locale}`, () => {
        expect(negotiateLocale(locale)).toBe(locale);
        // With region and other languages around it.
        expect(negotiateLocale(`${locale}-SA`)).toBe(locale);
        expect(negotiateLocale(`fr-FR,${locale};q=0.9`)).toBe(locale);
      });
    }
  });

  describe("unsupported and malformed input", () => {
    it("falls back to the default for a language it does not have", () => {
      expect(negotiateLocale("fr-FR")).toBe(DEFAULT_LOCALE);
      expect(negotiateLocale("zh-CN")).toBe(DEFAULT_LOCALE);
      expect(negotiateLocale("de")).toBe(DEFAULT_LOCALE);
    });

    it("falls back rather than throwing on absent or empty input", () => {
      expect(negotiateLocale(null)).toBe(DEFAULT_LOCALE);
      expect(negotiateLocale(undefined)).toBe(DEFAULT_LOCALE);
      expect(negotiateLocale("")).toBe(DEFAULT_LOCALE);
      expect(negotiateLocale("   ")).toBe(DEFAULT_LOCALE);
      expect(negotiateLocale(",,,;q=")).toBe(DEFAULT_LOCALE);
      expect(negotiateLocale(";;;")).toBe(DEFAULT_LOCALE);
    });

    it("honours the user priority order, not the alphabet", () => {
      // French first because it is listed first, but unknown; Urdu is next.
      expect(negotiateLocale("fr;q=1.0,ur;q=0.9,en;q=0.8")).toBe("ur");
      // A higher q later in the header still wins.
      expect(negotiateLocale("en;q=0.2,ur;q=0.95")).toBe("ur");
    });

    it("treats q=0 as a refusal, not a preference", () => {
      // "I accept English but explicitly not Arabic" must not pick Arabic.
      expect(negotiateLocale("ar;q=0,en;q=0.5")).toBe("en");
      expect(negotiateLocale("en;q=0,ur;q=0.4")).toBe("ur");
      // With every preference refused there is nothing left to honour, so the
      // fallback is correct — and the fallback happens to be the same locale the
      // refusal named, which is a coincidence, not a bug.
      expect(negotiateLocale("ar;q=0")).toBe(DEFAULT_LOCALE);
      expect(negotiateLocale("en;q=0,ur;q=0")).toBe(DEFAULT_LOCALE);
    });

    it("drops a region subtag to reach the language", () => {
      expect(negotiateLocale("fil-PH")).toBe("fil");
      expect(negotiateLocale("bn-BD")).toBe("bn");
      expect(negotiateLocale("hi-IN,en-US;q=0.9")).toBe("hi");
    });

    it("is case-insensitive, because header case is not guaranteed", () => {
      expect(negotiateLocale("AR-sa")).toBe("ar");
      expect(negotiateLocale("EN-GB")).toBe("en");
    });
  });

  describe("the URL always wins", () => {
    it("never overrides a locale already in the URL", () => {
      // The device says Urdu. The URL says Arabic. Arabic renders.
      expect(resolveLocale({ urlLocale: "ar", acceptLanguage: "ur-PK,ur;q=0.9" })).toBe("ar");
      expect(resolveLocale({ urlLocale: "en", acceptLanguage: "ar" })).toBe("en");
      // Including for a locale the app does not support, where detection takes over.
      expect(resolveLocale({ urlLocale: "fr", acceptLanguage: "ur" })).toBe("ur");
    });

    it("negotiates only when the URL carries no usable locale", () => {
      expect(resolveLocale({ urlLocale: null, acceptLanguage: "ur" })).toBe("ur");
      expect(resolveLocale({ urlLocale: "", acceptLanguage: "hi" })).toBe("hi");
      expect(resolveLocale({ acceptLanguage: "bn" })).toBe("bn");
      expect(resolveLocale({ acceptLanguage: null })).toBe(DEFAULT_LOCALE);
    });
  });

  describe("the stored preference", () => {
    it("round-trips a real choice", () => {
      const map = new Map<string, string>();
      const store = {
        getItem: (k: string) => map.get(k) ?? null,
        setItem: (k: string, v: string) => void map.set(k, v),
        removeItem: (k: string) => void map.delete(k),
      };
      writeLocalePreference(store, "fil");
      expect(map.get(LOCALE_PREFERENCE_KEY)).toBe("fil");
      expect(readLocalePreference(store)).toBe("fil");
      writeLocalePreference(store, null);
      expect(readLocalePreference(store)).toBe(null);
    });

    it("ignores a stored value that is not a supported locale", () => {
      const store = { getItem: () => "klingon" };
      expect(readLocalePreference(store)).toBe(null);
    });

    it("survives storage that throws, as in private mode", () => {
      const hostile = {
        getItem() { throw new Error("denied"); },
        setItem() { throw new Error("denied"); },
        removeItem() { throw new Error("denied"); },
      };
      expect(readLocalePreference(hostile)).toBe(null);
      expect(() => writeLocalePreference(hostile, "ur")).not.toThrow();
      expect(readLocalePreference(null)).toBe(null);
    });
  });
});
