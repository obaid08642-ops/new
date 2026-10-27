/**
 * The window of an infinite list: how many rows are open, and the next step. Pure, shared by the hub's client island and its tests.
 * The catalogue endpoints return every row, so "loading more" is opening more of the rows the page already holds.
 */
export const CATALOG_STEP = 20;

/** The rows to draw for `count` open rows, and whether more remain. */
export function openRows<T>(rows: readonly T[], count: number): { shown: T[]; hasMore: boolean } {
  const n = Math.max(CATALOG_STEP, Math.floor(count));
  const shown = rows.slice(0, n);
  return { shown, hasMore: rows.length > shown.length };
}

/** The count after reaching the end of the list (never past the rows there are). */
export function nextCount(count: number, total: number, step = CATALOG_STEP): number {
  return Math.min(Math.max(CATALOG_STEP, Math.floor(count)) + step, Math.max(total, CATALOG_STEP));
}
