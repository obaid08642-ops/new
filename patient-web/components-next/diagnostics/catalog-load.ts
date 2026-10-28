import { extractLabServices, labPaymentFits, type LabPay, type LabService } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { extractRadiologyServices, type RadiologyService } from "@/lib/api/radiology";
import { getPublicRadiologyServices } from "@/lib/api/radiology-server";
import { CATALOG_PAGE_SIZE, hasMorePages, parseCatalogPage, type CatalogSort } from "@/lib/diagnostics-catalog";
import { labRow, scanRow, type CatalogRow, type RowContext } from "./catalog-rows";

export type CatalogLoad = {
  /** false when the endpoint did not answer (the caller shows its error state) */
  ok: boolean;
  /** every service of the page as the server sent it (before the place / payment filters) */
  labs: LabService[];
  scans: RadiologyService[];
  page: number;
  hasMore: boolean;
  total: number | null;
};

export type CatalogRequest = {
  kind: "lab" | "radiology";
  page: number;
  limit?: number;
  /** radiology: the scan category (= modality) the server filters on; labs: unused (the chip filters the loaded rows) */
  category?: string;
  search?: string;
  sort?: CatalogSort;
};

const none = (page: number): CatalogLoad => ({ ok: false, labs: [], scans: [], page, hasMore: false, total: null });

/** One page of the hub's full list as the server sends it: it pages, sorts, searches and (for scans) filters by category. */
export async function loadCatalogPage(request: CatalogRequest): Promise<CatalogLoad> {
  const limit = request.limit ?? CATALOG_PAGE_SIZE;
  const base = { page: request.page, limit, search: request.search };
  const response =
    request.kind === "lab"
      ? await getPublicLabServices({ ...base, highestRated: request.sort === "highest_rated", lowestPrice: request.sort === "lowest_price" }).catch(() => null)
      : await getPublicRadiologyServices({ ...base, category: request.category, highestRated: request.sort === "highest_rated" ? "true" : undefined, lowestPrice: request.sort === "lowest_price" ? "true" : undefined }).catch(() => null);
  if (!response || !response.ok) return none(request.page);
  const info = parseCatalogPage(await response.json().catch(() => null));
  const hasMore = hasMorePages({ ...info, page: info.page ?? request.page }, limit);
  return request.kind === "lab"
    ? { ok: true, labs: extractLabServices(info.rows), scans: [], page: request.page, hasMore, total: info.total }
    : { ok: true, labs: [], scans: extractRadiologyServices(info.rows), page: request.page, hasMore, total: info.total };
}

/**
 * The rows of loaded pages. The place and payment of the order (home or at the lab, insurance or self-pay) hide the TESTS that do not fit;
 * scans are never hidden by the place (R1: only ultrasound is portable, so "home" hid x-ray, CT and MRI): a scan that cannot be done at home opens its order at the centre; packages and unavailable tests are not rows of the tests list.
 */
export function catalogRows(kind: "lab" | "radiology", loads: readonly CatalogLoad[], order: { place: "home" | "facility"; pay: LabPay }, ctx: RowContext): CatalogRow[] {
  const fitsPlace = (s: { homeVisitSupported?: boolean; facilityVisitSupported?: boolean }) => (order.place === "home" ? s.homeVisitSupported !== false : s.facilityVisitSupported !== false);
  return kind === "lab"
    ? loads.flatMap((l) => l.labs).filter((s) => s.isPackage !== true && !s.unavailable && fitsPlace(s) && labPaymentFits(order.pay, s)).map((s) => labRow(s, ctx))
    : loads.flatMap((l) => l.scans).map((s) => scanRow(s, ctx));
}
