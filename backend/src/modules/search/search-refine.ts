/**
 * Design parity (#1819): sort, price range and sale filter for GET /search, applied to the candidate window the engine
 * returned (Meilisearch or MongoDB), so both engines answer the same way. Items without a real price never match a price
 * filter and sort last by price; a prescription item never carries a sale (decision 10), so it never matches `on_sale`.
 */
export const SEARCH_SORTS = ['relevance', 'price_asc', 'price_desc'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export interface SearchRefine {
  sort?: SearchSort;
  price_min?: number;
  price_max?: number;
  on_sale?: boolean;
}

interface Refinable { price?: number | null; old_price?: number | null }

export const hasRefine = (r?: SearchRefine): boolean =>
  !!r && ((r.sort !== undefined && r.sort !== 'relevance') || r.price_min !== undefined || r.price_max !== undefined || r.on_sale === true);

export function refineItems<T extends Refinable>(items: T[], r?: SearchRefine): T[] {
  if (!hasRefine(r)) return items;
  let out = items.filter((it) => {
    const price = typeof it.price === 'number' ? it.price : null;
    if ((r!.price_min !== undefined || r!.price_max !== undefined) && price === null) return false;
    if (r!.price_min !== undefined && price! < r!.price_min) return false;
    if (r!.price_max !== undefined && price! > r!.price_max) return false;
    if (r!.on_sale === true && !(typeof it.old_price === 'number' && price !== null && it.old_price > price)) return false;
    return true;
  });
  if (r!.sort === 'price_asc' || r!.sort === 'price_desc') {
    const dir = r!.sort === 'price_asc' ? 1 : -1;
    // Stable: equal prices keep the engine's relevance order; items without a price go last either way.
    out = out.map((it, i) => ({ it, i })).sort((a, b) => {
      const pa = typeof a.it.price === 'number' ? a.it.price : null;
      const pb = typeof b.it.price === 'number' ? b.it.price : null;
      if (pa === null || pb === null) return pa === pb ? a.i - b.i : pa === null ? 1 : -1;
      return pa === pb ? a.i - b.i : (pa - pb) * dir;
    }).map((x) => x.it);
  }
  return out;
}
