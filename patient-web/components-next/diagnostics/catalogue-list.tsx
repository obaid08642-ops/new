import type { ReactElement } from "react";
import { getTranslations } from "next-intl/server";
import { ConsultState } from "@/components-next/consult/consult-state";
import { diagArtKeysOf, type DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import { contextQuery } from "@/lib/ordering/context";
import { catalogSortOf, serverCategoryOf } from "@/lib/diagnostics-catalog";
import type { HubSort } from "@/lib/diagnostics-hub";
import { CAT_LABEL } from "./diag-parts";
import { catalogRows, loadCatalogPage, type CatalogLoad } from "./catalog-load";
import { ItemCatalog, type CatalogChip } from "./item-catalog";

type Props = {
  /** `lab` = the tests, `radiology` = the scans: one list per kind, drawn the same wherever it appears. */
  kind: "lab" | "radiology";
  locale: string;
  search?: string;
  sort?: HubSort;
  cat: DiagArtKey | "all";
  /** the open server pages ("Show more" opens the next) */
  pages: number;
  /** The radiology page's own filters, sent with every page. */
  filters?: { modality?: string; bodyPart?: string; homeVisit?: boolean; lowestPrice?: boolean; highestRated?: boolean };
  /** Where a category chip goes (the page keeps its own filters in the address). */
  chipHref: (cat: DiagArtKey | "all") => string;
  /** The no-script "Show more" link. */
  moreHref: string;
  /** Rows open the public detail page (the radiology page, indexed) instead of the order item page (the hub). */
  detailHref?: boolean;
};

/**
 * The catalogue list of tests or scans, drawn by one component for every entry point (the hub's tabs, /diagnostics/labs and
 * /diagnostics/radiology): the catalogue is the only source, every service is listed with its offer summary (centres, from-price,
), and a service nobody offers yet stays in the list. The hub renders the same loader, rows and list. A plain async function (the page awaits it), so a page still renders in one pass.
 */
export async function catalogueList({ kind, locale, search, sort, cat, pages, filters, chipHref, moreHref, detailHref }: Props): Promise<ReactElement> {
  const t = await getTranslations({ locale, namespace: "DiagWeb" });
  const loads = await Promise.all(Array.from({ length: pages }, (_, i) => loadCatalogPage({
    kind, page: i + 1, search: search || undefined, sort: catalogSortOf(sort), category: serverCategoryOf(kind, cat), ...filters,
  })));
  const ok: CatalogLoad[] = [];
  for (const load of loads) { if (!load.ok) break; ok.push(load); }
  if (ok.length === 0) return <ConsultState kind="error" title={t("catalogErrorTitle")} body={t("catalogErrorBody")} retryLabel={t("retry")} />;
  const itemHref = (id: string, itemKind: "lab" | "radiology", facilityOnly?: boolean) => detailHref && itemKind === "radiology" ? `/${locale}/diagnostics/radiology/${encodeURIComponent(id)}` : `/${locale}/labs/${encodeURIComponent(id)}${contextQuery({ kind: itemKind, place: facilityOnly ? "facility" : "home", pay: "cash" })}`;
  const order = { place: "all", pay: "self_pay" } as const;
  const rows = catalogRows(kind, ok, order, { locale, tr: (key, values) => t(key, values), itemHref });
  const last = ok[ok.length - 1];
  const chips: CatalogChip[] = [{ key: "all", label: t("catAll"), href: chipHref("all") }, ...diagArtKeysOf(kind).map((key) => ({ key, label: t(CAT_LABEL[key]), href: chipHref(key) }))];
  const extra: Record<string, string> = {
    ...(filters?.modality ? { modality: filters.modality } : {}),
    ...(filters?.bodyPart ? { body_part: filters.bodyPart } : {}),
    ...(filters?.homeVisit ? { home_visit: "true" } : {}),
    ...(filters?.lowestPrice ? { lowest_price: "true" } : {}),
    ...(filters?.highestRated ? { highest_rated: "true" } : {}),
    ...(detailHref ? { detail: "1" } : {}),
  };
  return (
    <ItemCatalog
      key={`${kind}|${search ?? ""}|${sort ?? ""}|${JSON.stringify(extra)}|${pages}`}
      kind={kind}
      rows={rows}
      page={ok.length}
      hasMore={last.hasMore}
      cat={cat}
      chips={chips}
      chipsLabel={t("catLabel")}
      query={{ locale, q: search || undefined, sort, place: order.place, pay: order.pay, extra }}
      moreHref={moreHref}
      moreLabel={t("showMore")}
      orderHref={`/${locale}/labs/basket${contextQuery({ kind, place: "home", pay: "cash" })}`}
      listLabel={kind === "radiology" ? t("allScansTitle") : t("allTestsTitle")}
      emptyTitle={kind === "radiology" ? t("noScansTitle") : t("noTestsTitle")}
      emptyBody={kind === "radiology" ? t("noScansBody") : t("noTestsBody")}
      errorLabel={t("catalogErrorBody")}
    />
  );
}
