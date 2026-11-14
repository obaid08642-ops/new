"use client";

import { FieldText } from "@/components-next/ui/localized-field";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { filterByArt, type DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import { ItemActions } from "@/components-next/ordering/add-to-basket";
import type { ServiceKind } from "@/lib/ordering/quote";
import { CATALOG_PAGE_SIZE } from "@/lib/diagnostics-catalog";
import type { CatalogRow } from "./catalog-rows";
import { ItemCard, ShowMore } from "./item-card";
import styles from "./diag.module.css";

export type { CatalogRow } from "./catalog-rows";
export type CatalogChip = {
  key: DiagArtKey | "all" | "packages";
  label: string;
  href: string;
  /** A full page navigation (the packages chip, and every chip while the packages are open): the server draws the other list. */
  nav?: boolean;
};

type Props = {
  kind: ServiceKind;
  /** The server-rendered rows of the open pages. */
  rows: CatalogRow[];
  /** The last server page those rows hold. */
  page: number;
  /** The server has more pages after `page`. */
  hasMore: boolean;
  /** The chip the page opened with (`cat` in the URL). */
  cat: DiagArtKey | "all";
  chips: CatalogChip[];
  chipsLabel: string;
  /** What the next page request carries besides the page: locale, search, sort, place and payment (the chip is added). */
  query: { locale: string; q?: string; sort?: string; place: string; pay: string; /** the radiology page's own filters (modality, body_part, home_visit), sent with every page */ extra?: Record<string, string> };
  /** The no-script "Show more" link (the next step, same filters). */
  moreHref: string;
  moreLabel: string;
  orderHref: string;
  listLabel: string;
  emptyTitle: string;
  emptyBody: string;
  errorLabel: string;
  /** The packages chip is open: these rows are the whole list (no paging, no chip filter). */
  packageRows?: CatalogRow[];
};

type More = { rows: CatalogRow[]; page: number; hasMore: boolean };

/** One page of the catalogue from the load-more route; null when it failed. */
async function fetchPage(kind: ServiceKind, query: Props["query"], chip: DiagArtKey | "all", page: number): Promise<More | null> {
  const params = new URLSearchParams({ kind, page: String(page), locale: query.locale, place: query.place, pay: query.pay });
  if (query.q) params.set("q", query.q);
  if (query.sort) params.set("sort", query.sort);
  for (const [key, value] of Object.entries(query.extra ?? {})) params.set(key, value);
  if (chip !== "all") params.set("cat", chip);
  try {
    const response = await fetch(`/api/diagnostics/catalog?${params}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const body = (await response.json()) as { rows?: CatalogRow[]; page?: number; hasMore?: boolean };
    return { rows: Array.isArray(body.rows) ? body.rows : [], page: typeof body.page === "number" ? body.page : page, hasMore: body.hasMore === true };
  } catch {
    return null;
  }
}

/**
 * The full catalogue as category chips + a list the SERVER pages (owner review G4/G6; the endpoints take page, limit and category). The first
 * pages are drawn by the server; the list asks the next page when its end comes into view (IntersectionObserver) or "Show more" is pressed.
 * Scan chips filter on the server (a scan's category is its modality). Test chips filter the loaded rows by their category and keep asking
 * pages while few rows match, because the stored test categories do not match the chips one to one. Without script the chips are links and
 * "Show more" is a link to the next step.
 */
export function ItemCatalog({ kind, rows: initialRows, page: initialPage, hasMore: initialMore, cat: initialCat, chips, chipsLabel, query, moreHref, moreLabel, orderHref, listLabel, emptyTitle, emptyBody, errorLabel, packageRows }: Props) {
  const [cat, setCat] = useState<DiagArtKey | "all">(initialCat);
  const [rows, setRows] = useState<CatalogRow[]>(initialRows);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialMore);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const end = useRef<HTMLDivElement | null>(null);
  const busy = useRef(false);
  const serverFilter = kind === "radiology";

  // the rows shown: every loaded row for scans (the server already filtered), the chip's rows for tests
  const packagesOpen = packageRows !== undefined;
  const shown = packageRows ?? (serverFilter ? rows : filterByArt(rows, cat));

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore || packagesOpen) return;
    busy.current = true;
    setLoading(true);
    const next = await fetchPage(kind, query, cat, page + 1);
    busy.current = false;
    setLoading(false);
    if (!next) {
      setFailed(true);
      return;
    }
    setFailed(false);
    setRows((current) => [...current, ...next.rows.filter((row) => !current.some((have) => have.id === row.id))]);
    setPage(next.page);
    setHasMore(next.hasMore);
  }, [hasMore, kind, query, cat, page, packagesOpen]);

  useEffect(() => {
    const node = end.current;
    if (!node || !hasMore || failed || packagesOpen || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "400px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, failed, loadMore, shown.length, packagesOpen]);

  // a test chip that matches few of the loaded rows keeps asking pages (the list would otherwise stay short with a "Show more" under it)
  useEffect(() => {
    if (!packagesOpen && !serverFilter && cat !== "all" && hasMore && !loading && !failed && shown.length < CATALOG_PAGE_SIZE) void loadMore();
  }, [packagesOpen, serverFilter, cat, hasMore, loading, failed, shown.length, loadMore]);

  const pick = (chip: CatalogChip) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (chip.nav || chip.key === "packages" || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    if (chip.key === cat) return;
    try { window.history.replaceState(null, "", chip.href); } catch { /* the filter still applies on this page */ }
    setCat(chip.key as DiagArtKey | "all");
    setFailed(false);
    if (!serverFilter) return;
    // scans: the server filters, so the list starts again from page 1 of the chip
    setLoading(true);
    busy.current = true;
    void fetchPage(kind, query, chip.key as DiagArtKey | "all", 1).then((first) => {
      busy.current = false;
      setLoading(false);
      if (!first) { setRows([]); setHasMore(false); setFailed(true); return; }
      setRows(first.rows);
      setPage(first.page);
      setHasMore(first.hasMore);
    });
  };
  const more = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setFailed(false);
    void loadMore();
  };

  return (
    <div className={styles.stack}>
      <nav className={styles.catRow} aria-label={chipsLabel}>
        {chips.map((chip) => (
          <Link key={chip.key} href={chip.href} replace scroll={false} onClick={pick(chip)} aria-current={chip.key === (packagesOpen ? "packages" : cat) ? "true" : undefined} className={`${styles.catLink} ${chip.key === (packagesOpen ? "packages" : cat) ? styles.catLinkOn : ""}`}>{chip.label}</Link>
        ))}
      </nav>
      {shown.length === 0 && !loading && !hasMore ? (
        <div className={styles.emptyBox} role="status">
          <p className={styles.testName}>{emptyTitle}</p>
          <p className={styles.tagNote}>{emptyBody}</p>
        </div>
      ) : (
        <ul className={styles.itemGrid} aria-label={listLabel} aria-busy={loading}>
          {shown.map((row) => (
            <ItemCard key={row.id} href={row.href} title={<FieldText text={row.title} mark={row.titleMark} />} tags={row.tags} note={row.note} meta={row.meta} rating={row.rating} price={row.price} art={row.art} imageUrl={row.imageUrl} offer={row.offer} actions={<ItemActions kind={kind} line={row.line} orderHref={orderHref} disabled={row.offer?.none === true} />} />
          ))}
        </ul>
      )}
      {failed ? <p className={styles.tagNote} role="alert">{errorLabel}</p> : null}
      {hasMore && !packagesOpen ? <div onClickCapture={more}><ShowMore href={moreHref} label={moreLabel} /></div> : null}
      <div ref={end} aria-hidden="true" className={styles.endMark} />
    </div>
  );
}
