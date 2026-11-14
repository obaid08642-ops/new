"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, IconButton } from "@/components-next/ui-generated/components/Button";
import { DEGREES, GENDER_FILTERS, PAYMENT_FILTERS, filterPageParams, nearestApplies, effectiveType, type Degree, type DoctorFilters, type GenderFilter, type PaymentFilter } from "@/lib/consult/doctor-filters";
import styles from "./consult.module.css";

const SORTS = ["rating", "price", "wait", "nearest", "available_now"] as const;
type SortChoice = (typeof SORTS)[number] | "";

export type PanelProps = {
  locale: string;
  filters: DoctorFilters;
  /** The text search, specialty and sort the page already has; the sheet keeps them. */
  q?: string;
  specialty?: string;
  sort?: string;
  /** The page without any filter (visit type, search and specialty kept): "Clear all". */
  clearHref: string;
  /** Closes the panel (the trigger takes focus back). */
  onClose: () => void;
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * ONE "Filters" button next to the search (owner layout decision 15): it opens a bottom sheet on a phone and a side panel from 768,
 * with gender, grade, payment and sort. Apply writes the choices into the page URL (the same params the old chip rows linked
 * to), so the list stays shareable and server-rendered; "Clear all" goes to the unfiltered page. Escape, the close button and the dimmed
 * area close it, Tab stays inside, and focus goes back to the button.
 */
export default function DoctorFiltersPanel({ locale, filters, q, specialty, sort, clearHref, onClose }: PanelProps) {
  const t = useTranslations("Doctors");
  const router = useRouter();
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [gender, setGender] = useState<GenderFilter | "">(filters.gender ?? "");
  const [degree, setDegree] = useState<Degree | "">(filters.degree ?? "");
  const [payment, setPayment] = useState<PaymentFilter | "">(filters.payment ?? "");
  const initialSort: SortChoice = filters.availableNow ? "available_now" : filters.nearest ? "nearest" : (SORTS as readonly string[]).includes(sort ?? "") ? (sort as SortChoice) : "";
  const [sortChoice, setSortChoice] = useState<SortChoice>(initialSort);
  const dialogRef = useRef<HTMLDivElement>(null);
  const nearestBlocked = !nearestApplies(effectiveType(filters));

  const close = onClose;

  useEffect(() => {
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
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
  }, [close]);

  async function apply() {
    const next: DoctorFilters = {
      ...filters,
      gender: gender || undefined,
      degree: degree || undefined,
      payment: payment || undefined,
      insurer: payment === "insurance" ? filters.insurer : undefined,
      availableNow: sortChoice === "available_now",
      nearest: false,
      place: null,
    };
    let pageSort: string | undefined = sortChoice === "rating" || sortChoice === "price" || sortChoice === "wait" ? sortChoice : undefined;
    if (sortChoice === "" && !filters.availableNow && !filters.nearest) pageSort = sort;
    if (sortChoice === "nearest") {
      setBusy(true);
      setMessage(t("locating"));
      // Loaded on Apply, not with the page: the location code is only needed here (the doctors page is at its script budget).
      const { browserCoords, resolveNearbyPlace, savedAddressCity } = await import("@/lib/consult/doctor-filters-browser");
      const place = await resolveNearbyPlace({ deviceCoords: () => browserCoords(), savedCity: () => savedAddressCity() });
      setBusy(false);
      if (!place) { setMessage(t("nearestNoPlace")); return; }
      next.nearest = true;
      next.place = place;
    }
    const params = filterPageParams(next, { q, specialty, sort: pageSort });
    onClose();
    router.push(`/${locale}/consultations/doctors${params.size ? `?${params.toString()}` : ""}`);
  }

  const radio = <V extends string>(name: string, value: V | "", current: V | "", set: (v: V | "") => void, label: string, disabled = false) => (
    <label className={styles.filterChoice} data-disabled={disabled ? "true" : undefined}>
      <input type="radio" className="sr-only" name={name} checked={current === value} disabled={disabled} onChange={() => set(value)} />
      <span>{label}</span>
    </label>
  );

  return createPortal(
            <div className={styles.filterScrim} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
              <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={styles.filterPanel}>
                <div className={styles.filterHead}>
                  <h2 id={titleId} className={styles.filterTitle}>{t("filtersTitle")}</h2>
                  <IconButton name="close" label={t("filtersClose")} variant="outlined" onClick={close} />
                </div>
                <div className={styles.filterBody}>
                  <fieldset className={styles.filterGroup}>
                    <legend>{t("genderLabel")}</legend>
                    <div className={styles.filterChoices}>
                      {radio<GenderFilter>("gender", "", gender, setGender, t("filterAll"))}
                      {GENDER_FILTERS.map((g) => <span key={g}>{radio<GenderFilter>("gender", g, gender, setGender, t(g === "male" ? "genderMale" : "genderFemale"))}</span>)}
                    </div>
                  </fieldset>
                  <fieldset className={styles.filterGroup}>
                    <legend>{t("gradeLabel")}</legend>
                    <div className={styles.filterChoices}>
                      {radio<Degree>("degree", "", degree, setDegree, t("filterAll"))}
                      {DEGREES.map((d) => <span key={d}>{radio<Degree>("degree", d, degree, setDegree, t(`degree_${d}`))}</span>)}
                    </div>
                  </fieldset>
                  <fieldset className={styles.filterGroup}>
                    <legend>{t("paymentLabel")}</legend>
                    <div className={styles.filterChoices}>
                      {radio<PaymentFilter>("payment", "", payment, setPayment, t("filterAll"))}
                      {PAYMENT_FILTERS.map((p) => <span key={p}>{radio<PaymentFilter>("payment", p, payment, setPayment, t(`payment_${p}`))}</span>)}
                    </div>
                  </fieldset>
                  <fieldset className={styles.filterGroup}>
                    <legend>{t("sortLabel")}</legend>
                    <div className={styles.filterChoices}>
                      {SORTS.map((s) => {
                        const label = s === "rating" ? t("sortRating") : s === "price" ? t("sortPrice") : s === "wait" ? t("sortWait") : s === "nearest" ? t("nearest") : t("availableNow");
                        return <span key={s}>{radio<SortChoice>("sort", s, sortChoice, setSortChoice, label, s === "nearest" && nearestBlocked)}</span>;
                      })}
                    </div>
                    {nearestBlocked ? <p className={styles.quickNote}>{t("nearestOnline")}</p> : null}
                  </fieldset>
                  <p className={styles.quickNote} role="status">{message}</p>
                </div>
                <div className={styles.filterFoot}>
                  <Button label={t("filtersApply")} size="lg" fullWidth loading={busy} onClick={() => void apply()} />
                  <Button label={t("filtersClearAll")} variant="outline" size="lg" fullWidth onClick={() => { onClose(); router.push(clearHref); }} />
                </div>
              </div>
            </div>,
            document.body,
          );
}
