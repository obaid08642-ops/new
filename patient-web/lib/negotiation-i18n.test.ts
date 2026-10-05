// 099d36b review: the negotiation list rendered thread.resolution raw
// ("timeout", "rejected"), and an archived thread showed "archived".
import { describe, expect, it } from "vitest";
import { translateThreadResolution, translateThreadStatus } from "./negotiation-i18n";

const LOCALES = ["ar", "en", "ur", "hi", "bn", "fil"];
const RESOLUTIONS = ["accepted", "rejected", "removed", "cancelled", "timeout"];

describe("negotiation enums are translated", () => {
  it.each(LOCALES)("every thread resolution has a %s label", (locale) => {
    for (const r of RESOLUTIONS) {
      const label = translateThreadResolution(r, locale);
      expect(label).not.toBe(r);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it.each(LOCALES)("an archived thread has a %s label", (locale) => {
    expect(translateThreadStatus("archived", locale)).not.toBe("archived");
  });

  it("no resolution renders nothing", () => {
    expect(translateThreadResolution(undefined, "ar")).toBe("");
  });
});
