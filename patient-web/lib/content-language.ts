/**
 * A product section is shown in the page's language; when the API had to use another language for it, it says so in `fallback_langs`
 * (field → the language the text is in). The page marks such a section with `lang` / `dir` and a small note, so a language is never
 * mixed silently (owner rule 2026-10-26: Arabic pages fall back to English; English pages to Arabic; ur, hi, bn, fil to English, then Arabic).
 */
export type ContentLang = "ar" | "en" | "ur" | "hi" | "bn" | "fil";
const CONTENT_LANGS: readonly string[] = ["ar", "en", "ur", "hi", "bn", "fil"];

export const contentDir = (lang: ContentLang): "rtl" | "ltr" => (lang === "ar" || lang === "ur" ? "rtl" : "ltr");

export type FallbackMark = { lang: ContentLang; dir: "rtl" | "ltr" };

/** The mark of one field, or null when it is in the page's language (or the API sent no `fallback_langs`). */
export function fallbackMark(fallback: Record<string, string> | undefined | null, field: string, pageLocale: string): FallbackMark | null {
  const lang = fallback?.[field];
  if (!lang || lang === pageLocale || !CONTENT_LANGS.includes(lang)) return null;
  return { lang: lang as ContentLang, dir: contentDir(lang as ContentLang) };
}

/** The message key of the note: the two languages a section can fall back to. */
export const fallbackNoteKey = (lang: ContentLang): "contentOnlyEnglish" | "contentOnlyArabic" | null =>
  lang === "en" ? "contentOnlyEnglish" : lang === "ar" ? "contentOnlyArabic" : null;
