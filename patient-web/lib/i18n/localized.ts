import { z } from "zod";
import { localizedText } from "./localized-field";

/**
 * A catalogue field in every language the server holds it in. The catalogue rows (labs, scans, packages, nursing services,
 * specialties, insurers) carry `<field>_ar`, `<field>_en` and, once the services content is applied, `<field>_ur`, `_hi`,
 * `_bn` and `_tl` (Filipino is stored as `tl`). The pages used to read only Arabic and English, so Urdu read the Arabic text and
 * Hindi, Bengali and Filipino read the English text even when the row held their own.
 */
export type Texts = Partial<Record<"ar" | "en" | "ur" | "hi" | "bn" | "tl", string>>;

const SUFFIX: Record<string, keyof Texts> = { ar: "ar", en: "en", ur: "ur", hi: "hi", bn: "bn", fil: "tl", tl: "tl" };

/** The zod shape for the four translated columns of a field, to spread next to its `_ar` / `_en` columns. */
export function translatedColumns(field: string, max: number) {
  const text = z.string().trim().max(max).optional();
  return { [`${field}_ur`]: text, [`${field}_hi`]: text, [`${field}_bn`]: text, [`${field}_tl`]: text } as Record<string, z.ZodOptional<z.ZodString>>;
}

/** Reads `<field>_<language>` from a parsed row into a map; empty strings are dropped. */
export function textsOf(row: Record<string, unknown>, field: string): Texts {
  const out: Texts = {};
  for (const lang of ["ar", "en", "ur", "hi", "bn", "tl"] as const) {
    const value = row[`${field}_${lang}`];
    if (typeof value === "string" && value.trim()) out[lang] = value.trim();
  }
  return out;
}

/**
 * The text in the page's language, else the other language (never blank): rules in localized-field.ts (English before Arabic
 * on ur/hi/bn/fil). Use LocalizedField where the page can also show the "available in X only" note.
 */
export function pickTexts(locale: string, texts: Texts | undefined): string | undefined {
  if (!texts) return undefined;
  return localizedText({ locale, ar: texts.ar, en: texts.en, perLocale: { ur: texts.ur, hi: texts.hi, bn: texts.bn, fil: texts.tl } });
}

/**
 * Catalogue NAMES (cities, insurers, lab tests, scans, nursing services) are kept in Arabic and English only (owner decision
 * 2026-10-25): the Arabic page shows `ar`, every other page (Urdu, Hindi, Bengali, Filipino included) shows `en`. This is catalogue
 * data, not UI text, so the six-language rule does not apply. An old row that still holds `name_ur` ... is read as ar/en.
 */
export function namesOf(row: Record<string, unknown>): Texts {
  const out: Texts = {};
  for (const lang of ["ar", "en"] as const) {
    const value = row[`name_${lang}`];
    if (typeof value === "string" && value.trim()) out[lang] = value.trim();
  }
  return out;
}

/** The name for the page's language: Arabic on the Arabic page, English everywhere else, the other one when it is missing. */
export function pickName(locale: string, names: Texts | undefined): string | undefined {
  if (!names) return undefined;
  return localizedText({ locale, ar: names.ar, en: names.en });
}

/** True when the query is inside any language of the field (so a search finds a service by its translated name). */
export function textsInclude(texts: Texts | undefined, query: string, locale: string): boolean {
  if (!texts || !query) return false;
  return Object.values(texts).some((value) => value && value.toLocaleLowerCase(locale).includes(query));
}

/** The ur/hi/bn/fil columns of a multilingual field for resolveLocalizedField (presence marks the field as multilingual). */
export function perLocaleOf(texts: Texts | undefined) {
  return texts ? { ur: texts.ur, hi: texts.hi, bn: texts.bn, tl: texts.tl } : undefined;
}
