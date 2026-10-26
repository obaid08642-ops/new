import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { contentDir, fallbackMark, fallbackNoteKey } from "@/lib/content-language";
import { ProductSections, type DetailGroup } from "@/components-next/pharmacy/product-sections";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import ur from "@/messages/ur.json";
import hi from "@/messages/hi.json";
import bn from "@/messages/bn.json";
import fil from "@/messages/fil.json";

describe("fallbackMark", () => {
  it("marks only a section whose text is not in the page language", () => {
    const fb = { indications: "en", warnings: "ar", description: "ar" };
    expect(fallbackMark(fb, "indications", "ar")).toEqual({ lang: "en", dir: "ltr" });
    expect(fallbackMark(fb, "warnings", "en")).toEqual({ lang: "ar", dir: "rtl" });
    expect(fallbackMark(fb, "description", "ar")).toBeNull(); // already in the page language
    expect(fallbackMark(fb, "storage_conditions", "ar")).toBeNull();
    expect(fallbackMark(undefined, "indications", "ar")).toBeNull();
    expect(fallbackMark({ x: "xx" }, "x", "ar")).toBeNull(); // unknown language: not marked with a wrong tag
  });
  it("English text on an Arabic page is ltr, Arabic on any other page is rtl", () => {
    expect(contentDir("en")).toBe("ltr");
    expect(contentDir("ar")).toBe("rtl");
    expect(contentDir("ur")).toBe("rtl");
    expect(contentDir("fil")).toBe("ltr");
  });
  it("the note says English or Arabic, the only two languages a section falls back to", () => {
    expect(fallbackNoteKey("en")).toBe("contentOnlyEnglish");
    expect(fallbackNoteKey("ar")).toBe("contentOnlyArabic");
    expect(fallbackNoteKey("hi")).toBeNull();
  });
});

describe("the note exists in all six languages", () => {
  it.each([["en", en], ["ar", ar], ["ur", ur], ["hi", hi], ["bn", bn], ["fil", fil]] as const)("%s", (_l, m) => {
    const p = (m as unknown as { PublicProduct: Record<string, string> }).PublicProduct;
    expect(p.contentOnlyEnglish?.trim()).toBeTruthy();
    expect(p.contentOnlyArabic?.trim()).toBeTruthy();
  });
  it("no non-English file keeps the English sentence", () => {
    for (const m of [ar, ur, hi, bn, fil]) expect((m as unknown as { PublicProduct: Record<string, string> }).PublicProduct.contentOnlyEnglish).not.toBe(en.PublicProduct.contentOnlyEnglish);
  });
});

describe("ProductSections", () => {
  const groups: DetailGroup[] = [{
    id: "usage", title: "الاستخدام", sections: [
      { id: "description", title: "الوصف", items: ["وصف عربي"] },
      { id: "indications", title: "دواعي الاستعمال", items: ["Pain relief"], lang: "en", dir: "ltr", note: "متوفر بالإنجليزية فقط" },
    ],
  }];
  const html = renderToStaticMarkup(createElement(ProductSections, { groups, label: "x" }));
  it("puts lang/dir on the fallback text and a note above it; leaves the page-language section unmarked", () => {
    expect(html).toContain('lang="en" dir="ltr"');
    expect(html).toContain("متوفر بالإنجليزية فقط");
    expect(html).toContain('data-testid="lang-note-indications"');
    expect(html).not.toContain('data-testid="lang-note-description"');
    expect(html.match(/lang="/g)?.length).toBe(1);
  });
});
