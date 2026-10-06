import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicineRows, parseMedicineSearch } from "@/lib/api/medicines";
import { getPublicMedicines } from "@/lib/api/public-medicines-server";
import { getDirection, isLocale } from "@/lib/i18n";
import { CoreShell } from "@/components-next/core/core-shell";
import { RetryErrorState } from "@/components-next/core/core-states";
import { EmptyState } from "@/components-next/ui-generated/components/Feedback";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import { CatalogSearch } from "@/components-next/pharmacy/catalog-search";
import { PHARMACY_TONE } from "@/components-next/pharmacy/tones";
import styles from "@/components-next/pharmacy/pharmacy.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[]; page?: string | string[]; category?: string | string[]; sort?: string | string[] }>;
};

const PAGE_SIZE = 24;

export default async function MedicinesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Medicines");
  const b = await getTranslations("PharmacyBrowse");
  const routeState = await getTranslations("RouteState");
  const search = parseMedicineSearch(await searchParams);
  // F29: public SSR — no login gate; personalization happens client-side only.
  const response = await getPublicMedicines(search);
  const back = `/${locale}/pharmacy`;
  const unavailable = (
    <CoreShell locale={locale} title={t("title")} backHref={back}>
      <div className={styles.state}><RetryErrorState title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={routeState("retry")} /></div>
    </CoreShell>
  );
  if (!response) return unavailable;
  if (response.status === 404) notFound();
  if (!response.ok) return unavailable;

  const medicines = extractMedicineRows(await response.json().catch(() => null));
  const nameForLocale = (medicine: typeof medicines[number]) => locale === "ar" ? medicine.nameAr || medicine.nameEn || t("untitled") : medicine.nameEn || medicine.nameAr || t("untitled");
  const caret = getDirection(locale) === "rtl" ? "caret-left" : "caret-right";
  // the list carries no total: another page exists when this one is full
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (search.q) params.set("q", search.q);
    if (search.category) params.set("category", search.category);
    if (search.sort) params.set("sort", search.sort);
    params.set("page", String(page));
    return `/${locale}/medicines?${params.toString()}`;
  };

  return (
    <CoreShell locale={locale} title={t("title")} backHref={back}>
      <div className={styles.page}>
        <div className={styles.head}>
          <h1 className={styles.title}>{t("title")}</h1>
        </div>
        <div className={styles.searchWrap}>
          <CatalogSearch locale={locale} target="medicines" initial={search.q || ""} />
        </div>
        {medicines.length === 0 ? (
          <div className={styles.state}>
            <EmptyState icon="pill" tone={PHARMACY_TONE} title={b("emptyTitle")} body={t("empty")} />
          </div>
        ) : (
          <ul className={styles.rows} aria-label={t("title")}>
            {medicines.map((medicine) => {
              const detail = [medicine.form, medicine.strength].filter(Boolean).join(" · ");
              return (
                <li key={medicine.id}>
                  <Link className={styles.row} href={`/${locale}/medicines/${medicine.id}`}>
                    <span className={styles.rowMedia}><FIcon icon="pill" tone={PHARMACY_TONE} size={48} /></span>
                    <span className={styles.rowBody}>
                      <span className={styles.rowName}>{nameForLocale(medicine)}</span>
                      {medicine.activeIngredient ? <span className={styles.rowSub}>{medicine.activeIngredient}</span> : null}
                      {detail ? <span className={styles.rowSub}>{detail}</span> : null}
                      {medicine.requiresPrescription === true ? <StatusChip label={t("prescriptionRequired")} tone="amber" /> : null}
                    </span>
                    <span className={styles.rowEnd}><Icon name={caret} size={16} tone="secondary" /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {search.page > 1 || medicines.length >= PAGE_SIZE ? (
          <nav className={styles.pager} aria-label={b("pagination")}>
            {search.page > 1 ? (
              <Link rel="prev" href={pageHref(search.page - 1)} className={`nabd-button nabd-button--outline nabd-button--md ${styles.linkButton}`}>
                <span className="nabd-button__label">{b("previous")}</span>
              </Link>
            ) : null}
            <span className={styles.pagerInfo}>{b("pageNumber", { page: search.page })}</span>
            {medicines.length >= PAGE_SIZE ? (
              <Link rel="next" href={pageHref(search.page + 1)} className={`nabd-button nabd-button--outline nabd-button--md ${styles.linkButton}`}>
                <span className="nabd-button__label">{b("next")}</span>
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </CoreShell>
  );
}
