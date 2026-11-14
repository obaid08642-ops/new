import type { Texts } from "./localized";
import { resolveLocalizedList } from "./localized-field";

/** A catalogue list field (preparation steps) in every language the server holds it in: `<field>_<language>` arrays of text. */
export type TextLists = Partial<Record<keyof Texts, string[]>>;

const LANGS = ["ar", "en", "ur", "hi", "bn", "tl"] as const;
const SUFFIX: Record<string, keyof Texts> = { ar: "ar", en: "en", ur: "ur", hi: "hi", bn: "bn", fil: "tl", tl: "tl" };

/** Reads `<field>_<language>` string arrays from a row; empty lines and empty lists are dropped. */
export function listsOf(row: Record<string, unknown>, field: string): TextLists {
  const out: TextLists = {};
  for (const lang of LANGS) {
    const value = row[`${field}_${lang}`];
    if (!Array.isArray(value)) continue;
    const lines = value.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
    if (lines.length) out[lang] = lines;
  }
  return out;
}

/** The list in the page's language, else the other language (English before Arabic on ur/hi/bn/fil; localized-field.ts). */
export function pickList(locale: string, lists: TextLists | undefined): string[] {
  if (!lists) return [];
  return resolveLocalizedList({ locale, ar: lists.ar, en: lists.en, perLocale: { ur: lists.ur, hi: lists.hi, bn: lists.bn, tl: lists.tl } }).items;
}
