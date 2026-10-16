/**
 * Owner decision E (issue 1556, 2026-10-16): in Urdu, Hindi and Bengali the product's localized name is shown with
 * the English name under it (smaller), so a patient and a pharmacist read the same product. Not in ar, en or tl (fil).
 */
export const ENGLISH_UNDER_LANGS: readonly string[] = ['ur', 'hi', 'bn'];

export function englishNameUnder(lang: string, localizedName: string | null | undefined, englishName: unknown): string {
  if (!ENGLISH_UNDER_LANGS.includes(lang)) return '';
  const en = typeof englishName === 'string' ? englishName.trim() : '';
  if (!en || en === String(localizedName || '').trim()) return '';
  return en;
}
