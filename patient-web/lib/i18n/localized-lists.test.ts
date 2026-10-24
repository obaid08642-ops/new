import { describe, expect, it } from "vitest";
import { listsOf, pickList } from "./localized-lists";
import { pickTexts } from "./localized";
import { extractLabService } from "@/lib/api/labs";
import { parseRadiologyService } from "@/lib/api/radiology";
import { fromLab, fromRadiology, preparationFor } from "@/lib/ordering/item";

const lab = {
  id: "cbc", name_ar: "صورة دم", name_en: "Blood count", name_ur: "خون", name_hi: "रक्त गणना", name_bn: "রক্ত", name_tl: "Bilang ng dugo",
  description_hi: "विवरण", preparation_ar: ["بدون صيام"], preparation_en: ["No fasting"], preparation_hi: ["उपवास नहीं", " "], preparation_tl: ["Walang pag-aayuno"],
};

describe("catalogue lists in every language", () => {
  it("reads the arrays of each language and drops blank lines", () => {
    expect(listsOf(lab, "preparation")).toEqual({ ar: ["بدون صيام"], en: ["No fasting"], hi: ["उपवास नहीं"], tl: ["Walang pag-aayuno"] });
  });

  it("picks the page language with the old fallback (Arabic for ar/ur, English for the rest)", () => {
    const lists = listsOf(lab, "preparation");
    expect(pickList("hi", lists)).toEqual(["उपवास नहीं"]);
    expect(pickList("fil", lists)).toEqual(["Walang pag-aayuno"]);
    expect(pickList("bn", lists)).toEqual(["No fasting"]);
    expect(pickList("ur", lists)).toEqual(["بدون صيام"]);
    expect(pickList("hi", undefined)).toEqual([]);
  });

  it("a lab test carries its names and preparation in six languages into the item page", () => {
    const service = extractLabService(lab);
    expect(service).not.toBeNull();
    const item = fromLab(service!);
    expect(pickTexts("bn", item.names)).toBe("রক্ত");
    expect(pickTexts("hi", item.descriptions)).toBe("विवरण");
    expect(preparationFor("hi", item)).toEqual(["उपवास नहीं"]);
    expect(preparationFor("en", item)).toEqual(["No fasting"]);
    expect(preparationFor("bn", item)).toEqual(["No fasting"]);
  });

  it("a scan carries them too", () => {
    const scan = parseRadiologyService({ id: "xr", name_ar: "أشعة", name_en: "X-Ray", name_hi: "एक्स-रे", preparation_hi: ["धातु हटाएँ"], preparation_en: ["Remove metal"] });
    const item = fromRadiology(scan!);
    expect(pickTexts("hi", item.names)).toBe("एक्स-रे");
    expect(preparationFor("hi", item)).toEqual(["धातु हटाएँ"]);
  });
});

describe("the tests a package includes", () => {
  it("shows each included test in the page language, by name in any language, code or id; an unknown one stays as stored", async () => {
    const { includedTestNames, extractLabServices } = await import("@/lib/api/labs");
    const tests = extractLabServices([
      { id: "t1", short_code: "CBC", name_ar: "تحليل دم شامل", name_en: "Blood count", name_hi: "रक्त गणना" },
      { id: "t2", short_code: "FBS", name_ar: "سكر صائم", name_en: "Fasting sugar" },
    ]);
    const included = ["تحليل دم شامل", "FBS", "t1", "فحص غير معروف"];
    expect(includedTestNames("hi", included, tests)).toEqual(["रक्त गणना", "Fasting sugar", "रक्त गणना", "فحص غير معروف"]);
    expect(includedTestNames("ar", included, tests)).toEqual(["تحليل دم شامل", "سكر صائم", "تحليل دم شامل", "فحص غير معروف"]);
    expect(includedTestNames("en", [], tests)).toEqual([]);
  });
});
