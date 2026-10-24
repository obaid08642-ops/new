import type { Texts } from "./localized";

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

/** The list in the page's language, falling back as the pages always did (Arabic for ar and ur, English for the rest). */
export function pickList(locale: string, lists: TextLists | undefined): string[] {
  if (!lists) return [];
  const own = lists[SUFFIX[locale] ?? "en"];
  if (own?.length) return own;
  const rtl = locale === "ar" || locale === "ur";
  return (rtl ? lists.ar ?? lists.en : lists.en ?? lists.ar) ?? [];
}
