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

/** The brand and form values of the public catalogue (the facet lists), when known: a brand or form filter then becomes an EXACT match on the values that contain the text. */
export interface CatalogueFacets { brands: string[]; forms: string[] }

/** The facet values that contain `text` (case-insensitive, the old regex's meaning), at most 200. */
const facetMatches = (values: string[], text: string): string[] => {
  const t = text.toLowerCase();
  return values.filter((v) => v.toLowerCase().includes(t)).slice(0, 200);
};

/**
 * Clauses to AND into the listing filter, plus the price clause to merge with the price-order rule.
 * With `facets`, brand and (Arabic) form filters are exact `$in` matches: a case-insensitive regex cannot use an index, so every public document (about 20 KB each) was FETCHED and tested
 * (run 135: IXSCAN docsExamined 20,990 per request); an exact match is answered from the index. Without `facets` (they could not be read) the regex is used as before.
 */
export function catalogueFilterClauses(input: CatalogueFilterInput, dbLang: string, facets?: CatalogueFacets | null): { and: Record<string, unknown>[]; price: Record<string, number> | null } {
  const and: Record<string, unknown>[] = [];
  const form = clean(input.form);
  if (form) {
    const rx = { $regex: escapeRegex(form), $options: 'i' };
    const exact = facets?.forms?.length ? { form: { $in: facetMatches(facets.forms, form) } } : null;
    // the translated form text has no facet list: for another language it stays a regex (as before)
    and.push({ $or: [exact ?? { form: rx }, ...(dbLang !== 'ar' ? [{ [`translations.${dbLang}.form`]: rx }] : [])] });
  }
  const brand = clean(input.brand);
  if (brand) and.push(facets?.brands?.length ? { manufacturer: { $in: facetMatches(facets.brands, brand) } } : { manufacturer: { $regex: escapeRegex(brand), $options: 'i' } });
  if (input.rx === 'true') and.push({ $or: [{ requires_prescription: true }, { is_rx: true }] });
  else if (input.rx === 'false') and.push({ requires_prescription: { $ne: true }, is_rx: { $ne: true } });
  const min = money(input.price_min);
  const max = money(input.price_max);
  const price: Record<string, number> = {};
  if (min !== null) price.$gte = min;
  if (max !== null && (min === null || max >= min)) price.$lte = max;
  return { and, price: Object.keys(price).length ? price : null };
}
