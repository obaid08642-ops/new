/**
 * The paged labs and radiology catalogue (`GET /labs/services`, `GET /radiology/services`). What the backend really takes:
 * - `page`, `limit`: with `page` the answer is `{ data, total, page, limit, total_pages }`; without it, the plain array as before.
 *   `limit` defaults to 20 and the server caps it at 100.
 * - `category`: labs: the stored lab category (exact match); scans: the scan's modality (exact match, the same value as the `category`
 *   every scan carries).
 * - `search`, `home_visit=true`, `highest_rated=true` (the mean rating of the labs / centres that run the service, best first), `lowest_price=true`.
 * Pure helpers shared by the hub and the tests.
 */
import type { DiagArtKey, DiagKind } from '../../../packages/ui/icons/diag-art';

export const DIAG_PAGE_SIZE = 20;
export const DIAG_MAX_LIMIT = 100;

export type CatalogSort = 'highest_rated' | 'lowest_price';
export interface CatalogQuery {
  page: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: CatalogSort;
  homeVisit?: boolean;
}

/** The request path of one page, e.g. `/radiology/services?page=2&limit=20&category=mri&lowest_price=true`. Empty values are left out. */
export function catalogPath(kind: DiagKind, query: CatalogQuery): string {
  const params: string[] = [];
  const limit = Number.isInteger(query.limit) && (query.limit as number) >= 1 ? Math.min(query.limit as number, DIAG_MAX_LIMIT) : DIAG_PAGE_SIZE;
  params.push(`page=${Math.max(1, Math.floor(query.page))}`, `limit=${limit}`);
  const category = query.category?.trim();
  if (category && /^[A-Za-z0-9_ -]{1,60}$/.test(category)) params.push(`category=${encodeURIComponent(category)}`);
  const search = query.search?.trim();
  if (search) params.push(`search=${encodeURIComponent(search.slice(0, 120))}`);
  if (query.homeVisit) params.push('home_visit=true');
  if (query.sort) params.push(`${query.sort}=true`);
  return `${kind === 'radiology' ? '/radiology/services' : '/labs/services'}?${params.join('&')}`;
}

export interface CatalogPage {
  rows: unknown[];
  total: number | null;
  page: number | null;
  totalPages: number | null;
}

const whole = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);

/** Both answers of the endpoints: the plain array, or `{ data, total, page, limit, total_pages }`. Anything else is an empty page. */
export function parseCatalogPage(res: unknown): CatalogPage {
  if (Array.isArray(res)) return { rows: res, total: res.length, page: null, totalPages: null };
  if (res && typeof res === 'object' && Array.isArray((res as Record<string, unknown>).data)) {
    const r = res as Record<string, unknown>;
    return { rows: r.data as unknown[], total: whole(r.total), page: whole(r.page), totalPages: whole(r.total_pages) };
  }
  return { rows: [], total: null, page: null, totalPages: null };
}

/** More pages exist when the server said so (`total_pages`), else when this page came back full. */
export function hasMorePages(page: Pick<CatalogPage, 'rows' | 'page' | 'totalPages'>, requested: number, limit: number = DIAG_PAGE_SIZE): boolean {
  if (page.totalPages !== null) return (page.page ?? requested) < page.totalPages;
  return page.rows.length >= limit;
}

/**
 * The scan chip -> server `category` (a scan's category IS its modality, so a chip sends its own key). The six test chips do not match the
 * stored test categories one to one (sugar = diabetes, liver and kidney are two values, urine/stool has none), so they stay a client filter.
 */
export const serverCategoryOf = (kind: DiagKind, chip: DiagArtKey | 'all'): string | undefined => (kind === 'radiology' && chip !== 'all' ? chip : undefined);
