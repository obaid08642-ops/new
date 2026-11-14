// 15.5: the root error page has its words in every site language, and its direction follows the language.
import { describe, expect, it } from "vitest";
import { loadGlobalErrorCopy } from "@/lib/i18n/global-error";
import { SITE_LOCALES } from "@/lib/i18n/device-locale";

describe("loadGlobalErrorCopy", () => {
  it("has the four strings in every site language, none empty", async () => {
    for (const locale of SITE_LOCALES) {
      const copy = await loadGlobalErrorCopy(locale);
      for (const key of ["title", "body", "retry", "returnHome"] as const) {
        expect(copy[key].trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });

  it("is right-to-left for Arabic and Urdu, left-to-right for the rest", async () => {
    expect((await loadGlobalErrorCopy("ar")).dir).toBe("rtl");
    expect((await loadGlobalErrorCopy("ur")).dir).toBe("rtl");
    expect((await loadGlobalErrorCopy("en")).dir).toBe("ltr");
    expect((await loadGlobalErrorCopy("fil")).dir).toBe("ltr");
  });
});
