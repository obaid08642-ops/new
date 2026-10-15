import { parseArticleList, type ArticleSummary } from "@/lib/api/articles";
import { allowedImageUrl } from "@/lib/image-hosts";

/**
 * What the maternity hub reads from GET /maternity/content (issues #849 / #861): the admin's entry for the pregnancy week (the
 * baby's size line, a short development text and a CDN image; null when the admin has not filled or published it) and "Read
 * this week" (published articles tagged with that week). The texts are admin-authored in Arabic and English, like articles:
 * Arabic pages show the Arabic text, every other language the English one, each falling back to the other when it is empty.
 */
export type WeekEntry = { week: number; size: string; development: string; image: string | null };
export type MaternityContentView = { week: number | null; entry: WeekEntry | null; articles: ArticleSummary[] };

const str = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const rec = (value: unknown): Record<string, unknown> | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const weekOf = (value: unknown): number | null => (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 42 ? value : null);

/** The admin-authored text in the page language: Arabic for ar, English for the others, the other one when it is empty. */
export function pickWeekText(locale: string, ar: unknown, en: unknown): string | null {
  return locale === "ar" ? str(ar) ?? str(en) : str(en) ?? str(ar);
}

export function parseMaternityContent(payload: unknown, locale: string): MaternityContentView {
  const root = rec(payload);
  const data = rec(root?.data) ?? root;
  const week = weekOf(data?.week);
  const raw = rec(data?.week_content);
  const entryWeek = weekOf(raw?.week);
  const size = pickWeekText(locale, raw?.size_ar, raw?.size_en);
  const development = pickWeekText(locale, raw?.development_ar, raw?.development_en);
  const entry = raw && entryWeek !== null && size && development ? { week: entryWeek, size, development, image: allowedImageUrl(str(raw.image_url)) } : null;
  return { week, entry, articles: week === null ? [] : parseArticleList(data?.read_this_week).filter((article) => articleTitle(locale, article) !== null).slice(0, 10) };
}

/** The title of an article row in the page language (articles carry Arabic and English titles). */
export function articleTitle(locale: string, article: ArticleSummary): string | null {
  return pickWeekText(locale, article.titleAr, article.titleEn);
}
