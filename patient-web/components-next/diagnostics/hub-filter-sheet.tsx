"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, IconButton } from "@/components-next/ui-generated/components/Button";
import { filterByArt, type DiagArtKey } from "@/components-next/ui-generated/icons/diag-art";
import type { CatalogRow } from "./catalog-rows";
import consult from "@/components-next/consult/consult.module.css";
import styles from "./diag.module.css";

export type HubFilterValues = {
  place: "all" | "facility" | "home";
  pay: "self_pay" | "insurance";
  sort: "" | "rating" | "price";
  noFast: boolean;
  sameDay: boolean;
};

type Props = {
  locale: string;
  kind: "labs" | "radiology";
  /** The search text and the category chip the page has; the sheet keeps them. */
  q: string;
  cat: string;
  values: HubFilterValues;
  /** The insurance choice is offered only when a lab takes insurance (labs). */
  showPay: boolean;
  /** How many filters are on (shown on the button). */
  count: number;
  /** The results the page lists now, and whether the server has more pages: the count of the button before the sheet is changed. */
  resultCount: number;
  resultMore: boolean;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The page URL for a set of choices: a default is never written (the URL stays what the page links build). */
export function hubFilterParams(base: { kind: "labs" | "radiology"; q: string; cat: string }, v: HubFilterValues): URLSearchParams {
  const params = new URLSearchParams();
  if (base.q) params.set("q", base.q);
  if (base.kind === "radiology") params.set("kind", "radiology");
  if (v.place !== "all") params.set("place", v.place);
  if (v.pay === "insurance") params.set("pay", "insurance");
  if (v.sort) params.set("sort", v.sort);
  if (v.noFast) params.set("nofast", "1");
  if (v.sameDay) params.set("sameday", "1");
  if (base.cat && base.cat !== "all") params.set("cat", base.cat);
  return params;
}

/**
 * The hub's ONE filter button (next to the search) and its sheet: a bottom sheet on a phone and a side panel from 768 (same shell as the
 * doctors filters). The sheet is a real GET form to the hub, so the choices are URL params and the list stays shareable and server-drawn.
 * The button of the sheet shows "Show N results" with the real count: the server's first page of the pending choices (the same route as
 * "Show more"), "N+" when the server has more. Escape and the close button close it, Tab stays inside, focus goes back to the button.
 */
export function HubFilterSheet({ locale, kind, q, cat, values, showPay, count, resultCount, resultMore }: Props) {
  const t = useTranslations("DiagWeb");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);
  return (
    <>
      <button ref={triggerRef} type="button" className={consult.filtersButton} aria-haspopup="dialog" aria-expanded={open} aria-label={count > 0 ? t("filterOpenCount", { n: count }) : t("filterOpen")} onClick={() => setOpen(true)}>
        <span>{t("filterOpen")}</span>
        {count > 0 ? <span className={consult.filtersBadge} aria-hidden="true">{new Intl.NumberFormat(locale).format(count)}</span> : null}
      </button>
      {open ? <Sheet locale={locale} kind={kind} q={q} cat={cat} values={values} showPay={showPay} resultCount={resultCount} resultMore={resultMore} onClose={close} /> : null}
    </>
  );
}

function Sheet({ locale, kind, q, cat, values, showPay, resultCount, resultMore, onClose }: Omit<Props, "count"> & { onClose: () => void }) {
  const t = useTranslations("DiagWeb");
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [v, setV] = useState<HubFilterValues>(values);
  const [shown, setShown] = useState({ count: resultCount, more: resultMore });
  const [counting, setCounting] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === firstItem || active === dialogRef.current)) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && active === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = previousOverflow; };
  }, [onClose]);

  // the real count of the pending choices: the server's first page for them (rows after the place / payment / fasting / result-time filters)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ kind: kind === "labs" ? "lab" : "radiology", page: "1", locale, place: v.place, pay: v.pay });
      if (q) params.set("q", q);
      if (v.sort) params.set("sort", v.sort);
      if (v.noFast) params.set("nofast", "1");
      if (v.sameDay) params.set("sameday", "1");
      if (kind === "radiology" && cat !== "all") params.set("cat", cat);
      setCounting(true);
      fetch(`/api/diagnostics/catalog?${params}`, { headers: { Accept: "application/json" }, signal: controller.signal })
        .then((response) => (response.ok ? (response.json() as Promise<{ rows?: CatalogRow[]; hasMore?: boolean }>) : null))
        .then((body) => {
          if (!body) return;
          const rows = Array.isArray(body.rows) ? body.rows : [];
          setShown({ count: kind === "labs" ? filterByArt(rows, cat as DiagArtKey | "all").length : rows.length, more: body.hasMore === true });
        })
        .catch(() => undefined)
        .finally(() => setCounting(false));
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [v, kind, q, cat, locale]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = hubFilterParams({ kind, q, cat }, v);
    onClose();
    router.push(`/${locale}/diagnostics${params.size ? `?${params.toString()}` : ""}`);
  }

  const radio = <K extends "place" | "pay" | "sort">(name: K, value: HubFilterValues[K], label: string) => (
    <label className={consult.filterChoice}>
      <input type="radio" className="sr-only" name={name} value={value} checked={v[name] === value} onChange={() => setV((prev) => ({ ...prev, [name]: value }))} />
      <span>{label}</span>
    </label>
  );
  const toggle = (name: "noFast" | "sameDay", field: string, label: string) => (
    <label className={consult.filterChoice}>
      <input type="checkbox" className="sr-only" name={field} value="1" checked={v[name]} onChange={(event) => setV((prev) => ({ ...prev, [name]: event.target.checked }))} />
      <span>{label}</span>
    </label>
  );
  const number = new Intl.NumberFormat(locale).format(shown.count);
  const cta = counting ? t("filterCounting") : t(shown.more ? "showResultsMore" : "showResults", { count: number });

  return createPortal(
    <div className={consult.filterScrim} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={consult.filterPanel}>
        <form method="get" action={`/${locale}/diagnostics`} onSubmit={apply} className={styles.sheetForm}>
          <div className={consult.filterHead}>
            <h2 id={titleId} className={consult.filterTitle}>{t("filterSheetTitle")}</h2>
            <IconButton name="close" label={t("filterClose")} variant="outlined" onClick={onClose} />
          </div>
          <div className={consult.filterBody}>
            {q ? <input type="hidden" name="q" value={q} /> : null}
            {kind === "radiology" ? <input type="hidden" name="kind" value="radiology" /> : null}
            {cat !== "all" ? <input type="hidden" name="cat" value={cat} /> : null}
            {showPay ? (
              <fieldset className={consult.filterGroup}>
                <legend>{t("payLabel")}</legend>
                <div className={consult.filterChoices}>
                  {radio("pay", "self_pay", t("paySelf"))}
                  {radio("pay", "insurance", t("payInsurance"))}
                </div>
              </fieldset>
            ) : null}
            <fieldset className={consult.filterGroup}>
              <legend>{t("placeLabel")}</legend>
              <div className={consult.filterChoices}>
                {radio("place", "all", t("filterAll"))}
                {radio("place", "facility", kind === "labs" ? t("placeLab") : t("placeCenter"))}
                {radio("place", "home", kind === "labs" ? t("placeHomeLab") : t("placeHomeScan"))}
              </div>
            </fieldset>
            <fieldset className={consult.filterGroup}>
              <legend>{t("filterSort")}</legend>
              <div className={consult.filterChoices}>
                {radio("sort", "", t("sortPopular"))}
                {radio("sort", "price", t("sortPrice"))}
                {radio("sort", "rating", t("sortRating"))}
              </div>
            </fieldset>
            <fieldset className={consult.filterGroup}>
              <legend>{t("filterMore")}</legend>
              <div className={consult.filterChoices}>
                {toggle("noFast", "nofast", t("noFasting"))}
                {toggle("sameDay", "sameday", t("sameDay"))}
              </div>
            </fieldset>
          </div>
          <div className={consult.filterFoot}>
            <Button type="submit" label={cta} size="lg" fullWidth />
            <Button label={t("filterClearAll")} variant="outline" size="lg" fullWidth onClick={() => setV({ place: "all", pay: "self_pay", sort: "", noFast: false, sameDay: false })} />
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
