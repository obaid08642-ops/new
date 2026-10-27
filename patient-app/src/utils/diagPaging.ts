/**
 * The full tests and scans of the hub, shown a page at a time. The catalogue endpoints (`GET /labs/services`,
 * `GET /radiology/services`) take no page or limit: they return every row, so the paging is on the device.
 */
export const DIAG_PAGE_SIZE = 20;

/** The first `pages` pages of `rows`, and how many rows are still hidden. */
export function visibleRows<T>(rows: readonly T[], pages: number, size: number = DIAG_PAGE_SIZE): { shown: T[]; remaining: number } {
  const count = Math.max(1, Math.floor(pages)) * size;
  const shown = rows.slice(0, count);
  return { shown, remaining: Math.max(0, rows.length - shown.length) };
}
