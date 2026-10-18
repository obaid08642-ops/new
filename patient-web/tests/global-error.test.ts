// 15.5: the root error page has its words in every site language, and its direction follows the language.
import { describe, expect, it } from "vitest";
import { getGlobalErrorCopy } from "@/lib/i18n/global-error";
import { SITE_LOCALES } from "@/lib/i18n/device-locale";

describe("getGlobalErrorCopy", () => {
  it("has the four strings in every site language, none empty", () => {
    for (const locale of SITE_LOCALES) {
      const copy = getGlobalErrorCopy(locale);
      for (const key of ["title", "body", "retry", "returnHome"] as const) {
        expect(copy[key].trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });

  it("is right-to-left for Arabic and Urdu, left-to-right for the rest", () => {
    expect(getGlobalErrorCopy("ar").dir).toBe("rtl");
    expect(getGlobalErrorCopy("ur").dir).toBe("rtl");
    expect(getGlobalErrorCopy("en").dir).toBe("ltr");
    expect(getGlobalErrorCopy("fil").dir).toBe("ltr");
  });
});
