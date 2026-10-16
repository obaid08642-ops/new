/**
 * Owner decision E (issue 1556, 2026-10-16): on ur, hi and bn the product's localized name is shown with the English
 * name under it (smaller), so a patient and a pharmacist read the same product. Not for ar, en or fil.
 */
export const ENGLISH_UNDER_LOCALES: readonly string[] = ["ur", "hi", "bn"];

export function englishNameUnder(locale: string, localizedName: string | null | undefined, englishName: string | null | undefined): string | null {
  if (!ENGLISH_UNDER_LOCALES.includes(locale)) return null;
  const en = (englishName || "").trim();
  if (!en || en === (localizedName || "").trim()) return null;
  return en;
}
