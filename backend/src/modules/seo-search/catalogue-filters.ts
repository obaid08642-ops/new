/**
 * Design parity (#1819): the category listing's extra filters (form, brand, rx, price range) as one Mongo clause set.
 * Every value is validated here; whatever does not parse is ignored, never passed to Mongo.
 */
export interface CatalogueFilterInput {
  form?: string;
  brand?: string;
  rx?: string;
  price_min?: string;
  price_max?: string;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Control characters (a NUL makes MongoDB reject the regex) never belong in a filter value.
const clean = (v: unknown): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, 80) : '');
const money = (v: unknown): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null;
};

/** Clauses to AND into the listing filter, plus the price clause to merge with the price-order rule. */
export function catalogueFilterClauses(input: CatalogueFilterInput, dbLang: string): { and: Record<string, unknown>[]; price: Record<string, number> | null } {
  const and: Record<string, unknown>[] = [];
  const form = clean(input.form);
  if (form) {
    const rx = { $regex: escapeRegex(form), $options: 'i' };
    and.push({ $or: [{ form: rx }, ...(dbLang !== 'ar' ? [{ [`translations.${dbLang}.form`]: rx }] : [])] });
  }
  const brand = clean(input.brand);
  if (brand) and.push({ manufacturer: { $regex: escapeRegex(brand), $options: 'i' } });
  if (input.rx === 'true') and.push({ $or: [{ requires_prescription: true }, { is_rx: true }] });
  else if (input.rx === 'false') and.push({ requires_prescription: { $ne: true }, is_rx: { $ne: true } });
  const min = money(input.price_min);
  const max = money(input.price_max);
  const price: Record<string, number> = {};
  if (min !== null) price.$gte = min;
  if (max !== null && (min === null || max >= min)) price.$lte = max;
  return { and, price: Object.keys(price).length ? price : null };
}
