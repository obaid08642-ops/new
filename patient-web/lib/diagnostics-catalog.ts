/**
 * The paged labs and radiology catalogue (GET /labs/services, GET /radiology/services). What the backend really takes:
 *   page, limit  : with `page` the answer is { data, total, page, limit, total_pages }; without it, the plain array as before.
 *                  limit defaults to 20 and is capped at 100 by the server.
 *   category     : labs: the stored lab category (exact match); radiology: the scan's modality (exact match, same value as the
 *                  `category` every scan carries).
 *   search       : the name search.   home_visit=true : only services that do home visits.
 *   highest_rated=true : best rated first (rating = the mean of the labs / centres that run the service); lowest_price=true.
 * Pure helpers, shared by the server pages, the load-more route and the tests.
 */
import type { DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import type { HubSort } from "@/lib/diagnostics-hub";

/** Rows per page, on the first render and for every "Show more" (the server caps `limit` at 100). */
export const CATALOG_PAGE_SIZE = 20;
export const CATALOG_MAX_LIMIT = 100;

export type CatalogSort = "highest_rated" | "lowest_price";
export type CatalogQuery = { page?: number; limit?: number; category?: string; search?: string; sort?: CatalogSort; homeVisit?: boolean };

/** The hub's sort in the URL (`rating` / `price`) as the backend's flag. */
export function catalogSortOf(sort: HubSort | undefined): CatalogSort | undefined {
  return sort === "rating" ? "highest_rated" : sort === "price" ? "lowest_price" : undefined;
}

const token = /^[A-Za-z0-9_ -]{1,60}$/;

/** The query string of one catalogue request; an invalid or empty value is left out. */
export function catalogParams(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.page !== undefined && Number.isInteger(query.page) && query.page >= 1) {
    params.set("page", String(Math.min(query.page, 10_000)));
    const limit = query.limit !== undefined && Number.isInteger(query.limit) && query.limit >= 1 ? Math.min(query.limit, CATALOG_MAX_LIMIT) : CATALOG_PAGE_SIZE;
    params.set("limit", String(limit));
  }
  if (query.category && token.test(query.category)) params.set("category", query.category);
  if (query.search?.trim()) params.set("search", query.search.trim().slice(0, 120));
  if (query.homeVisit) params.set("home_visit", "true");
  if (query.sort) params.set(query.sort, "true");
  return params;
}

export type CatalogPageInfo = { rows: unknown[]; total: number | null; page: number | null; totalPages: number | null };

const whole = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null);

/** Both answers of the endpoints: the plain array (no `page` sent) or { data, total, page, limit, total_pages }. Anything else is an empty page. */
export function parseCatalogPage(value: unknown): CatalogPageInfo {
  if (Array.isArray(value)) return { rows: value, total: value.length, page: null, totalPages: null };
  if (value && typeof value === "object") {
    const root = value as Record<string, unknown>;
    if (Array.isArray(root.data)) return { rows: root.data, total: whole(root.total), page: whole(root.page), totalPages: whole(root.total_pages) };
  }
  return { rows: [], total: null, page: null, totalPages: null };
}

/** More pages exist when the server said so (`total_pages`), else when this page was full. */
export function hasMorePages(info: Pick<CatalogPageInfo, "page" | "totalPages" | "rows">, limit = CATALOG_PAGE_SIZE): boolean {
  if (info.totalPages !== null && info.page !== null) return info.page < info.totalPages;
  return info.rows.length >= limit;
}

/**
 * The chip -> server `category` rule. Scans: a scan's category IS its modality, so a chip sends its own key (xray, ct, mri, ultrasound,
 * mammography, ecg). Labs: the stored categories (blood, hormones, vitamins, diabetes, liver, kidney, infection ...) are free text and
 * do not match the six chips one to one (sugar = diabetes, liver/kidney are two values, urine/stool has none), so labs keep the chip as a
 * client filter on the loaded rows and send no category.
 */
export function serverCategoryOf(kind: "lab" | "radiology", chip: DiagArtKey | "all"): string | undefined {
  return kind === "radiology" && chip !== "all" ? chip : undefined;
}
