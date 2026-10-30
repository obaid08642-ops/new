/**
 * LANGUAGE FALLBACK for catalogue text (owner decision 2026-10-30). A product, lab, scan or nursing field is NEVER hidden because
 * it has no text in the page language: it is shown in the other language, tagged with that text's own `lang` / `dir`, and the
 * page adds a small "Available in English only" / "Available in Arabic only" note (app: src/components/LocalizedField.tsx).
 * Ported unchanged from patient-web/lib/i18n/localized-field.ts (same rules, same results; keep the two in step). No React here. The rules:
 *
 *  1. SCRIPT CHECK. The column a string sits in is not trusted. A value with Arabic-script letters is Arabic; a value with other
 *     letters (Latin...) is English (= "non-Arabic"); a value with no letters at all (a number, "500") keeps its column. So an
 *     Arabic string stored in `en` counts as Arabic, and an English string stored in `ar` counts as English. Blank = absent.
 *  2. PAGE LANGUAGE FIRST.
 *       ar: the Arabic text, else the English text (fallback).
 *       en: the English text, else the Arabic text (fallback).
 *       ur / hi / bn / fil: `perLocale[locale]` when the row has one, else English, else Arabic.
 *  3. WHEN IT IS A "FALLBACK" (note shown): the text is not in the page language. For ur/hi/bn/fil the English text is the page's
 *     own text (not a fallback, no note) when the field is held in Arabic and English only (no `perLocale` passed: names, categories,
 *     as the catalogue does); it is a fallback (note "English only") when the field is multilingual (`perLocale` passed, e.g. a
 *     description with ur/hi/bn/tl columns) and the page's language is missing. Arabic text on ur/hi/bn/fil is always a fallback.
 *  4. ONE VALUE ONLY: whatever column it sits in (after rule 1) it is shown; it is never dropped.
 *  5. `lang` and `dir` describe the text actually returned (Arabic and Urdu are rtl, the rest ltr), so an English paragraph on an
 *     Arabic page is lang="en" dir="ltr" and Arabic on an English page is lang="ar" dir="rtl".
 *  6. Nothing at all: `text` is "" and nothing is drawn (never a placeholder).
 */
export type FieldLocale = "ar" | "en" | "ur" | "hi" | "bn" | "fil";
export type FieldLang = FieldLocale;
export type PerLocaleText = Partial<Record<FieldLocale | "tl", string | null | undefined>>;

export type LocalizedFieldInput = {
  locale: string;
  ar?: string | null;
  en?: string | null;
  /** Texts held per language (ur, hi, bn, fil or tl); presence marks the field as multilingual (rule 3). */
  perLocale?: PerLocaleText;
};

export type LocalizedFieldResult = {
  text: string;
  lang: FieldLang;
  dir: "rtl" | "ltr";
  fallback: boolean;
  /** The language the shown text is in when `fallback`, else null. */
  fallbackFrom: "ar" | "en" | null;
};

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿ]/;
const ANY_LETTER = /\p{L}/u;

export const fieldDir = (lang: FieldLang): "rtl" | "ltr" => (lang === "ar" || lang === "ur" ? "rtl" : "ltr");
const LOCALES: readonly string[] = ["ar", "en", "ur", "hi", "bn", "fil"];

const clean = (v: string | null | undefined): string => (typeof v === "string" ? v.trim() : "");

/** The language a string is really in (rule 1): "ar" for Arabic script, "en" for other letters, else the column it came from. */
export function scriptOf(value: string, column: "ar" | "en"): "ar" | "en" {
  if (ARABIC_SCRIPT.test(value)) return "ar";
  if (ANY_LETTER.test(value)) return "en";
  return column;
}

export function resolveLocalizedField({ locale, ar, en, perLocale }: LocalizedFieldInput): LocalizedFieldResult {
  const page: FieldLocale = (LOCALES.includes(locale) ? locale : locale === "tl" ? "fil" : "en") as FieldLocale;
  let arabic = "";
  let english = "";
  for (const [value, column] of [[clean(ar), "ar"], [clean(en), "en"]] as const) {
    if (!value) continue;
    if (scriptOf(value, column) === "ar") arabic ||= value;
    else english ||= value;
  }
  const own = page === "ar" || page === "en" ? "" : clean(perLocale?.[page] ?? (page === "fil" ? perLocale?.tl : undefined));
  const multilingual = perLocale !== undefined;
  const pick = (): LocalizedFieldResult => {
    const shown = (text: string, lang: FieldLang, fallback: boolean): LocalizedFieldResult => ({ text, lang, dir: fieldDir(lang), fallback, fallbackFrom: fallback ? (lang === "ar" ? "ar" : "en") : null });
    if (page === "ar") return arabic ? shown(arabic, "ar", false) : english ? shown(english, "en", true) : shown("", "ar", false);
    if (page === "en") return english ? shown(english, "en", false) : arabic ? shown(arabic, "ar", true) : shown("", "en", false);
    if (own) return shown(own, page, false);
    if (english) return shown(english, "en", multilingual);
    if (arabic) return shown(arabic, "ar", true);
    return shown("", page, false);
  };
  return pick();
}

/** Just the text (for titles, meta tags, JSON-LD and anything that cannot carry a note). */
export function localizedText(input: LocalizedFieldInput): string | undefined {
  return resolveLocalizedField(input).text || undefined;
}

/** What a card needs to draw a resolved text honestly: its own lang/dir when they differ from the page's, and the fallback source. */
export type FieldMark = { lang: FieldLang; dir: "rtl" | "ltr"; fallbackFrom: "ar" | "en" | null };

/** The mark of a resolved field, or undefined when the text is in the page's language (nothing to tag). */
export function fieldMark(field: LocalizedFieldResult, locale: string): FieldMark | undefined {
  const page = locale === "tl" ? "fil" : locale;
  if (!field.text || (field.lang === page && !field.fallback)) return undefined;
  return { lang: field.lang, dir: field.dir, fallbackFrom: field.fallbackFrom };
}

/** Text and mark in one call, for rows that cross from the server to a client component (strings, no React). */
export function resolveWithMark(input: LocalizedFieldInput): { text: string; mark?: FieldMark } {
  const field = resolveLocalizedField(input);
  return { text: field.text, mark: fieldMark(field, input.locale) };
}

const LIST_SEP = "\u0000";
export type LocalizedListResult = Omit<LocalizedFieldResult, "text"> & { items: string[] };

/** A list field (preparation steps, ingredients): the same rules as a text, applied to the whole list (its lines joined, so one list is one language). */
export function resolveLocalizedList({ locale, ar, en, perLocale }: { locale: string; ar?: readonly string[] | null; en?: readonly string[] | null; perLocale?: Partial<Record<FieldLocale | "tl", readonly string[] | null | undefined>> }): LocalizedListResult {
  const join = (list?: readonly string[] | null) => (list ?? []).map((x) => x.trim()).filter(Boolean).join(LIST_SEP);
  const per: PerLocaleText | undefined = perLocale ? Object.fromEntries(Object.entries(perLocale).map(([k, v]) => [k, join(v)])) : undefined;
  const { text, ...rest } = resolveLocalizedField({ locale, ar: join(ar), en: join(en), perLocale: per });
  return { ...rest, items: text ? text.split(LIST_SEP) : [] };
}

/**
 * A text the API already chose the language of (one `name` string, a search suggestion): there is no second column to compare, so only
 * the script is checked. Arabic-script text on a page that is not ar/ur, or other-script text on an ar/ur page, gets its own lang/dir
 * (an English product name inside an Arabic page is lang="en" dir="ltr"). No note is drawn (the API's `fallback_langs` decides that);
 * `fallbackFrom` is null. Digits-only text is never marked.
 */
export function markByScript(locale: string, text: string | null | undefined): FieldMark | undefined {
  const value = clean(text);
  if (!value || !ANY_LETTER.test(value)) return undefined;
  const arabicPage = locale === "ar" || locale === "ur";
  const arabicText = ARABIC_SCRIPT.test(value);
  if (arabicText === arabicPage) return undefined;
  return arabicText ? { lang: "ar", dir: "rtl", fallbackFrom: null } : { lang: "en", dir: "ltr", fallbackFrom: null };
}
