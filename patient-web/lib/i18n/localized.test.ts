import { describe, expect, it } from "vitest";
import { pickTexts, textsInclude, textsOf } from "./localized";
import { extractNursingCatalog } from "@/lib/api/nursing-catalog";
import { extractHomeCareServices } from "@/lib/api/home-care-services";

const row = { id: "svc-1", name_ar: "قياس", name_en: "Vitals", name_ur: "پیمائش", name_hi: "जांच", name_bn: "পরিমাপ", name_tl: "Pagsukat", description_hi: "विवरण" };

describe("localized catalogue text", () => {
  it("reads every language column and drops empty ones", () => {
    expect(textsOf({ ...row, name_hi: "  " }, "name")).toEqual({ ar: "قياس", en: "Vitals", ur: "پیمائش", bn: "পরিমাপ", tl: "Pagsukat" });
  });

  it("picks the page language, and Filipino reads the tl column", () => {
    const texts = textsOf(row, "name");
    expect(pickTexts("hi", texts)).toBe("जांच");
    expect(pickTexts("bn", texts)).toBe("পরিমাপ");
    expect(pickTexts("ur", texts)).toBe("پیمائش");
    expect(pickTexts("fil", texts)).toBe("Pagsukat");
    expect(pickTexts("ar", texts)).toBe("قياس");
    expect(pickTexts("en", texts)).toBe("Vitals");
  });

  it("falls back as the pages always did: Arabic for ar and ur, English for the rest, then anything", () => {
    expect(pickTexts("ur", { ar: "عربي", en: "English" })).toBe("عربي");
    expect(pickTexts("hi", { ar: "عربي", en: "English" })).toBe("English");
    expect(pickTexts("hi", { ar: "عربي" })).toBe("عربي");
    expect(pickTexts("hi", {})).toBeUndefined();
    expect(pickTexts("hi", undefined)).toBeUndefined();
  });

  it("finds a service by a translated name", () => {
    expect(textsInclude(textsOf(row, "name"), "जां", "hi")).toBe(true);
    expect(textsInclude(textsOf(row, "name"), "nothing", "hi")).toBe(false);
  });

  it("the nursing catalogue and the home care service carry the six languages", () => {
    const [item] = extractNursingCatalog([row]);
    expect(pickTexts("hi", item.names)).toBe("जांच");
    expect(pickTexts("hi", item.descriptions)).toBe("विवरण");
    const [service] = extractHomeCareServices([row]);
    expect(pickTexts("bn", service.names)).toBe("পরিমাপ");
    expect(service.nameEn).toBe("Vitals");
  });
});
