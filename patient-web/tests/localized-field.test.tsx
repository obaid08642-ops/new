import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { NextIntlClientProvider } from "next-intl";
import { resolveLocalizedField, resolveLocalizedList, markByScript, localizedText } from "@/lib/i18n/localized-field";
import { LocalizedField } from "@/components-next/ui/localized-field";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import ur from "@/messages/ur.json";
import hi from "@/messages/hi.json";
import bn from "@/messages/bn.json";
import fil from "@/messages/fil.json";

const r = resolveLocalizedField;
describe("resolveLocalizedField", () => {
  it("page language first", () => {
    expect(r({ locale: "ar", ar: "باراسيتامول", en: "Paracetamol" })).toMatchObject({ text: "باراسيتامول", lang: "ar", dir: "rtl", fallback: false, fallbackFrom: null });
    expect(r({ locale: "en", ar: "باراسيتامول", en: "Paracetamol" })).toMatchObject({ text: "Paracetamol", lang: "en", dir: "ltr", fallback: false });
  });
  it("ar falls back to English, en to Arabic, with the note", () => {
    expect(r({ locale: "ar", en: "Paracetamol" })).toMatchObject({ text: "Paracetamol", lang: "en", dir: "ltr", fallback: true, fallbackFrom: "en" });
    expect(r({ locale: "en", ar: "باراسيتامول" })).toMatchObject({ text: "باراسيتامول", lang: "ar", dir: "rtl", fallback: true, fallbackFrom: "ar" });
  });
  it("ur/hi/bn/fil prefer English, then Arabic", () => {
    for (const l of ["ur", "hi", "bn", "fil"]) {
      expect(r({ locale: l, ar: "باراسيتامول", en: "Paracetamol" })).toMatchObject({ text: "Paracetamol", lang: "en", dir: "ltr", fallback: false });
      expect(r({ locale: l, ar: "باراسيتامول" })).toMatchObject({ text: "باراسيتامول", lang: "ar", dir: "rtl", fallback: true, fallbackFrom: "ar" });
    }
  });
  it("a multilingual field uses its own language, and English is a labelled fallback", () => {
    expect(r({ locale: "ur", ar: "ا", en: "x", perLocale: { ur: "اردو" } })).toMatchObject({ text: "اردو", lang: "ur", dir: "rtl", fallback: false });
    expect(r({ locale: "fil", en: "Hello", perLocale: { tl: "Kumusta" } })).toMatchObject({ text: "Kumusta", lang: "fil", dir: "ltr" });
    expect(r({ locale: "hi", ar: "وصف", en: "Description", perLocale: {} })).toMatchObject({ text: "Description", lang: "en", fallback: true, fallbackFrom: "en" });
  });
  it("detects text in the wrong column", () => {
    expect(r({ locale: "ar", ar: "Paracetamol", en: "باراسيتامول" })).toMatchObject({ text: "باراسيتامول", lang: "ar", fallback: false });
    expect(r({ locale: "en", ar: "Paracetamol", en: "باراسيتامول" })).toMatchObject({ text: "Paracetamol", lang: "en", fallback: false });
    expect(r({ locale: "ar", en: "باراسيتامول" })).toMatchObject({ lang: "ar", fallback: false });
  });
  it("one value only is shown whatever its column; digits keep their column", () => {
    expect(r({ locale: "en", ar: "  وصف  " }).text).toBe("وصف");
    expect(r({ locale: "ar", ar: null, en: "Only English" }).text).toBe("Only English");
    expect(r({ locale: "ar", en: "500" })).toMatchObject({ text: "500", lang: "en", fallback: true });
  });
  it("empty gives nothing", () => {
    expect(r({ locale: "ar", ar: "  ", en: "" })).toMatchObject({ text: "", fallback: false });
    expect(localizedText({ locale: "en" })).toBeUndefined();
  });
});

const wrap = (locale: string, messages: object, el: React.ReactElement) => renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages: messages as never }, el));
describe("LocalizedField", () => {
  it("ar page, English-only name: lang=en dir=ltr and the note", () => {
    const html = wrap("ar", ar, createElement(LocalizedField, { locale: "ar", en: "Panadol", as: "h1" }));
    expect(html).toContain('<h1 lang="en" dir="ltr">Panadol</h1>');
    expect(html).toContain("متاح بالإنجليزية فقط");
  });
  it("en page, Arabic-only name: lang=ar dir=rtl and the note", () => {
    const html = wrap("en", en, createElement(LocalizedField, { locale: "en", ar: "بنادول" }));
    expect(html).toContain('<span lang="ar" dir="rtl">بنادول</span>');
    expect(html).toContain("Available in Arabic only");
  });
  it("ur page prefers English and needs no note for an ar/en field", () => {
    const html = wrap("ur", ur, createElement(LocalizedField, { locale: "ur", ar: "بنادول", en: "Panadol" }));
    expect(html).toContain('lang="en" dir="ltr"');
    expect(html).toContain("Panadol");
    expect(html).not.toContain("language-fallback-note");
  });
  it("a page-language text has no lang/dir and no note; note={false} drops the note", () => {
    expect(wrap("ar", ar, createElement(LocalizedField, { locale: "ar", ar: "بنادول", en: "Panadol" }))).toBe("بنادول");
    expect(wrap("ar", ar, createElement(LocalizedField, { locale: "ar", en: "Panadol", note: false }))).not.toContain("<small");
  });
  it("the two keys exist, translated, in all six locales", () => {
    for (const [l, m] of [["en", en], ["ar", ar], ["ur", ur], ["hi", hi], ["bn", bn], ["fil", fil]] as const) {
      const s = (m as unknown as { Shared: Record<string, string> }).Shared;
      expect(s.availableInEnglishOnly?.trim()).toBeTruthy();
      expect(s.availableInArabicOnly?.trim()).toBeTruthy();
      if (l !== "en") expect(s.availableInEnglishOnly).not.toBe(en.Shared.availableInEnglishOnly);
    }
  });
});

describe("lists and single strings", () => {
  it("a preparation list is shown whole in one language, English first on ur, the note on a fallback", () => {
    expect(resolveLocalizedList({ locale: "ur", ar: ["صيام"], en: ["Fast 8 hours", "Water is fine"] })).toMatchObject({ items: ["Fast 8 hours", "Water is fine"], lang: "en", fallback: false });
    expect(resolveLocalizedList({ locale: "ar", ar: [], en: ["Fast"] })).toMatchObject({ items: ["Fast"], lang: "en", dir: "ltr", fallback: true, fallbackFrom: "en" });
    expect(resolveLocalizedList({ locale: "en" }).items).toEqual([]);
  });
  it("markByScript tags only a script that is not the page's", () => {
    expect(markByScript("ar", "Panadol")).toEqual({ lang: "en", dir: "ltr", fallbackFrom: null });
    expect(markByScript("en", "بنادول")).toEqual({ lang: "ar", dir: "rtl", fallbackFrom: null });
    expect(markByScript("hi", "بنادول")).toMatchObject({ lang: "ar" });
    expect(markByScript("ar", "بنادول")).toBeUndefined();
    expect(markByScript("ar", "500")).toBeUndefined();
  });
});
