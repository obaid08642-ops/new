/**
 * What the maternity hub reads from GET /maternity/content (issues #849 / #861): the admin's entry for the pregnancy week (the
 * baby's size line, a short development text and an image URL on the CDN; null when the admin has not filled or published it)
 * and "Read this week" (published articles tagged with that week). The texts are admin-authored in Arabic and English, like
 * articles: Arabic shows the Arabic text, every other language the English one, each falling back to the other when empty.
 * Nothing is bundled in the app (owner decision D).
 */
export interface WeekEntry { week: number; size: string; development: string; image: string | null }
export interface WeekArticle { slug: string; title: string; excerpt: string | null }
export interface MaternityContentView { week: number | null; entry: WeekEntry | null; articles: WeekArticle[] }

/** The CDN hosts a week image may come from (the backend accepts only these; patient-web/lib/image-hosts.ts). */
const IMAGE_HOSTS = ['cdn.nabd.plus', 'res.cloudinary.com'];
const SLUG = /^[A-Za-z0-9_-]{1,160}$/;

const str = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);
const rec = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
const weekOf = (value: unknown): number | null => (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 42 ? value : null);

export function pickWeekText(lang: string, ar: unknown, en: unknown): string | null {
  return lang === 'ar' ? str(ar) ?? str(en) : str(en) ?? str(ar);
}

/** An https image on the CDN, or null (no other host, no credentials in the URL). */
export function cdnImage(value: unknown): string | null {
  const raw = str(value);
  if (!raw || raw.length > 800) return null;
  const match = /^https:\/\/([^/?#@:]+)(?:[/?#]|$)/i.exec(raw);
  return match && IMAGE_HOSTS.includes(match[1].toLowerCase()) ? raw : null;
}

export function parseMaternityContent(payload: unknown, lang: string): MaternityContentView {
  const root = rec(payload);
  const data = rec(root?.data) ?? root;
  const week = weekOf(data?.week);
  const raw = rec(data?.week_content);
  const entryWeek = weekOf(raw?.week);
  const size = pickWeekText(lang, raw?.size_ar, raw?.size_en);
  const development = pickWeekText(lang, raw?.development_ar, raw?.development_en);
  const entry = raw && entryWeek !== null && size && development ? { week: entryWeek, size, development, image: cdnImage(raw.image_url) } : null;
  const rows = Array.isArray(data?.read_this_week) ? data.read_this_week : [];
  const articles = week === null ? [] : rows.flatMap((item): WeekArticle[] => {
    const row = rec(item);
    const slug = str(row?.slug);
    const title = pickWeekText(lang, row?.title_ar, row?.title_en);
    return row && slug && SLUG.test(slug) && title ? [{ slug, title, excerpt: pickWeekText(lang, row.excerpt_ar, row.excerpt_en) }] : [];
  }).slice(0, 10);
  return { week, entry, articles };
}
