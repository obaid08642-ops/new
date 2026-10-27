"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { filterByArt, type DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import { ItemActions } from "@/components-next/ordering/add-to-basket";
import type { LineNames } from "@/lib/ordering/basket";
import type { ServiceKind } from "@/lib/ordering/quote";
import { nextCount, openRows, CATALOG_STEP } from "@/lib/catalog-window";
import { ItemCard, ShowMore, type ItemTag } from "./item-card";
import styles from "./diag.module.css";

export type CatalogRow = {
  id: string;
  art: DiagArtKey;
  href: string;
  title: string;
  tags?: ItemTag[];
  note?: string;
  price?: string;
  imageUrl?: string;
  line: { id: string; nameAr?: string; nameEn?: string; names?: LineNames };
};
export type CatalogChip = { key: DiagArtKey | "all"; label: string; href: string };

type Props = {
  kind: ServiceKind;
  rows: CatalogRow[];
  /** The chip the page opened with (`cat` in the URL). */
  cat: DiagArtKey | "all";
  chips: CatalogChip[];
  chipsLabel: string;
  /** How many rows are open when the page opens (the server-rendered `more` steps). */
  initialCount: number;
  /** The no-script "Show more" link (the next `more` step, same filters). */
  moreHref: string;
  moreLabel: string;
  orderHref: string;
  listLabel: string;
  emptyTitle: string;
  emptyBody: string;
};

/**
 * The full catalogue as category chips + an infinite list (owner review G4). Everything is already on the page (the endpoints return every
 * row), so a chip filters the rows on the client by their category and the list opens more rows when its end comes into view
 * (IntersectionObserver). Without script the chips are links (the server draws the same list) and "Show more" is a link to the next step.
 */
export function ItemCatalog({ kind, rows, cat: initialCat, chips, chipsLabel, initialCount, moreHref, moreLabel, orderHref, listLabel, emptyTitle, emptyBody }: Props) {
  const [cat, setCat] = useState<DiagArtKey | "all">(initialCat);
  const [count, setCount] = useState(Math.max(CATALOG_STEP, initialCount));
  const end = useRef<HTMLDivElement | null>(null);

  const filtered = filterByArt(rows, cat);
  const { shown, hasMore } = openRows(filtered, count);

  useEffect(() => {
    const node = end.current;
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((n) => nextCount(n, filtered.length));
    }, { rootMargin: "400px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, filtered.length, shown.length]);

  const pick = (chip: CatalogChip) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setCat(chip.key);
    setCount(CATALOG_STEP);
    try { window.history.replaceState(null, "", chip.href); } catch { /* the filter still applies on this page */ }
  };
  const more = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setCount((n) => nextCount(n, filtered.length));
  };

  return (
    <div className={styles.stack}>
      <nav className={styles.catRow} aria-label={chipsLabel}>
        {chips.map((chip) => (
          <Link key={chip.key} href={chip.href} replace scroll={false} onClick={pick(chip)} aria-current={chip.key === cat ? "true" : undefined} className={`${styles.catLink} ${chip.key === cat ? styles.catLinkOn : ""}`}>{chip.label}</Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <div className={styles.emptyBox} role="status">
          <p className={styles.testName}>{emptyTitle}</p>
          <p className={styles.tagNote}>{emptyBody}</p>
        </div>
      ) : (
        <ul className={styles.itemGrid} aria-label={listLabel}>
          {shown.map((row) => (
            <ItemCard key={row.id} href={row.href} title={row.title} tags={row.tags} note={row.note} price={row.price} art={row.art} imageUrl={row.imageUrl} actions={<ItemActions kind={kind} line={row.line} orderHref={orderHref} />} />
          ))}
        </ul>
      )}
      {hasMore ? <div onClickCapture={more}><ShowMore href={moreHref} label={moreLabel} /></div> : null}
      <div ref={end} aria-hidden="true" className={styles.endMark} />
    </div>
  );
}
