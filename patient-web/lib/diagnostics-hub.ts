/**
 * The diagnostics hub's search and filter sheet (the app's filter sheet: all, packages, labs, highest rated, lowest price). The state is
 * in the page URL: `q` filters the loaded lists of the chosen kind in place, `show` picks packages or tests only (labs), and `sort` is
 * "rating" (the approved labs strip, best first) or "price" (lowest price first). Home visit is the place switch that is already on the page.
 */
export const HUB_SHOW = ["packages", "tests"] as const;
export const HUB_SORT = ["rating", "price"] as const;
export type HubShow = (typeof HUB_SHOW)[number];
export type HubSort = (typeof HUB_SORT)[number];
export type HubFilter = { q: string; show?: HubShow; sort?: HubSort };

export function parseHubFilter(raw: { q?: string; show?: string; sort?: string }): HubFilter {
  const q = (raw.q ?? "").trim().slice(0, 100);
  const show = (HUB_SHOW as readonly string[]).includes(raw.show ?? "") ? (raw.show as HubShow) : undefined;
  const sort = (HUB_SORT as readonly string[]).includes(raw.sort ?? "") ? (raw.sort as HubSort) : undefined;
  return { q, ...(show ? { show } : {}), ...(sort ? { sort } : {}) };
}

/** True when the query is empty or is found (any case) in one of the names. */
export function matchesQuery(q: string, ...names: Array<string | undefined>): boolean {
  const needle = q.trim().toLocaleLowerCase();
  return !needle || names.some((name) => name?.toLocaleLowerCase().includes(needle));
}

/** Lowest price first; rows without a price go last. Returns a new list. */
export function byPrice<T extends { price?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY));
}

/** Best rating first; rows without a rating go last. Returns a new list. */
export function byRating<T extends { rating?: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.rating ?? Number.NEGATIVE_INFINITY) - (a.rating ?? Number.NEGATIVE_INFINITY));
}
