"use client";

import { Suspense, lazy, useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { DoctorFilters } from "@/lib/consult/doctor-filters";
import styles from "./consult.module.css";

// The panel is only needed once the button is pressed (the doctors page is at its script budget).
// React.lazy, not next/dynamic: the dynamic loader runtime (about 1 KB gzip) would ship with the page for a panel that is rarely opened.
const Panel = lazy(() => import("./doctor-filters-panel"));

type Props = {
  locale: string;
  filters: DoctorFilters;
  q?: string;
  specialty?: string;
  sort?: string;
  clearHref: string;
  /** How many filters are on; shown on the button as a badge. */
  count: number;
};

/** ONE "Filters" button next to the search (owner layout decision 15); it opens the bottom sheet / side panel in doctor-filters-panel. */
export function DoctorFiltersSheet({ count, ...panel }: Props) {
  const t = useTranslations("Doctors");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  return (
    <>
      <button ref={triggerRef} type="button" className={styles.filtersButton} aria-haspopup="dialog" aria-expanded={open} aria-label={count > 0 ? t("filtersWithCount", { n: count }) : t("filters")} onClick={() => setOpen(true)}>
        <span>{t("filters")}</span>
        {count > 0 ? <span className={styles.filtersBadge} aria-hidden="true">{new Intl.NumberFormat(panel.locale).format(count)}</span> : null}
      </button>
      {panel.filters.payment ? (
        <button type="button" className={styles.filtersChip} aria-haspopup="dialog" onClick={() => setOpen(true)}>{t(`payment_${panel.filters.payment}`)}</button>
      ) : null}
      {open ? <Suspense fallback={null}><Panel {...panel} onClose={close} /></Suspense> : null}
    </>
  );
}
