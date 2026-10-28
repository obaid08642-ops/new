import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { catalogRows, loadCatalogPage } from "@/components-next/diagnostics/catalog-load";
import { catalogSortOf, serverCategoryOf } from "@/lib/diagnostics-catalog";
import { parseDiagArt } from "@/components-next/ui-generated/icons/diag-art";
import { parseHubFilter } from "@/lib/diagnostics-hub";
import { isLocale } from "@/lib/i18n";
import { contextQuery } from "@/lib/ordering/context";

/**
 * "Show more" of the hub's full list of tests or scans: the next server page (public data, no session), already drawn into rows in the
 * page's language. Same loader as the server-rendered first page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") ?? "";
  if (!isLocale(locale)) return NextResponse.json({ message: "invalid_locale" }, { status: 400 });
  const kind = url.searchParams.get("kind") === "radiology" ? "radiology" : "lab";
  const page = Number.parseInt(url.searchParams.get("page") ?? "", 10);
  if (!Number.isInteger(page) || page < 1 || page > 10_000) return NextResponse.json({ message: "invalid_page" }, { status: 400 });
  const filter = parseHubFilter({ q: url.searchParams.get("q") ?? undefined, sort: url.searchParams.get("sort") ?? undefined });
  const chip = parseDiagArt(url.searchParams.get("cat"), kind);
  const place = url.searchParams.get("place") === "facility" ? "facility" : url.searchParams.get("place") === "all" ? "all" : "home";
  const pay = url.searchParams.get("pay") === "insurance" ? "insurance" : "self_pay";
  const t = await getTranslations({ locale, namespace: "DiagWeb" });
  // the radiology page's own filters travel with every page (the hub sends none)
  const modality = url.searchParams.get("modality") ?? undefined;
  const bodyPart = url.searchParams.get("body_part") ?? undefined;
  const result = await loadCatalogPage({ kind, page, search: filter.q || undefined, sort: catalogSortOf(filter.sort), category: serverCategoryOf(kind, chip), modality, bodyPart, homeVisit: url.searchParams.get("home_visit") === "true", lowestPrice: url.searchParams.get("lowest_price") === "true", highestRated: url.searchParams.get("highest_rated") === "true" });
  if (!result.ok) return NextResponse.json({ message: "catalog_unavailable" }, { status: 502, headers: { "cache-control": "no-store" } });
  const rows = catalogRows(kind, [result], { place, pay }, {
    locale,
    tr: (key, values) => t(key, values),
    itemHref: (id, itemKind) => url.searchParams.get("detail") === "1" && itemKind === "radiology" ? `/${locale}/diagnostics/radiology/${encodeURIComponent(id)}` : `/${locale}/labs/${encodeURIComponent(id)}${contextQuery({ kind: itemKind, place: place === "all" ? "home" : place, pay: pay === "insurance" ? "insurance" : "cash" })}`,
  });
  return NextResponse.json({ rows, page: result.page, hasMore: result.hasMore, total: result.total }, { headers: { "cache-control": "no-store" } });
}
