import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicineRows, parseMedicineSearch } from "@/lib/api/medicines";
import { getPublicMedicines } from "@/lib/api/public-medicines-server";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { Icon } from "@/components-next/ui-generated/src/Icon";
// 12.A7 / 12.C2 — the submit control is the contract's `Button`, not hand-rolled
// markup. It is also the one place on this screen that could stop importing
// lucide: C2 forbids a primitive icon library in a screen, and `startIcon` takes
// a platform-free name from the curated set. The three icons still imported above
// are outside that set, which is why this is one of three and not three of three.
import { Button } from "@/components-next/ui-generated/components/Button";
import styles from "../medicine-catalog/medicine-catalog.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

export default async function MedicinesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Medicines");
  const search = parseMedicineSearch(await searchParams);
  // F29: public SSR — no login gate; personalization happens client-side only.
  const response = await getPublicMedicines(search);
  if (!response) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Icon name="pill" size={24} /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  if (response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Icon name="pill" size={24} /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;

  const medicines = extractMedicineRows(await response.json().catch(() => null));
  const nameForLocale = (medicine: typeof medicines[number]) => locale === "ar" ? medicine.nameAr || medicine.nameEn || t("untitled") : medicine.nameEn || medicine.nameAr || t("untitled");
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}>
      <div>
        <p className={styles.eyebrow}><Icon name="shield-check" size={15} />{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
      </div>
      <span className={styles.heroIcon}><Icon name="pill" size={27} /></span>
    </section>
    <form className={styles.search} action={`/${locale}/medicines`} method="get">
      <label className={styles.field}>
        <span>{t("searchLabel")}</span>
        <span className={styles.fieldInput}><Icon name="search" size={18} /><input name="q" maxLength={80} defaultValue={search.q} autoComplete="off" /></span>
      </label>
      <Button type="submit" variant="primary" label={t("search")} startIcon="search" />
    </form>
    {medicines.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Icon name="pill" size={24} /></span><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>
      {medicines.map((medicine) => <Link className={styles.card} key={medicine.id} href={`/${locale}/medicines/${medicine.id}`}>
        <span className={styles.cardTop}><span className={styles.medicineIcon}><Icon name="pill" size={20} /></span><Icon name="arrow-up-left" className={styles.openIcon} size={17} /></span>
        <strong className={styles.name}>{nameForLocale(medicine)}</strong>
        {medicine.activeIngredient ? <span className={styles.detail}>{medicine.activeIngredient}</span> : null}
        {medicine.form || medicine.strength ? <span className={styles.detail}>{[medicine.form, medicine.strength].filter(Boolean).join(" · ")}</span> : null}
        {medicine.requiresPrescription === true ? <span className={styles.prescription}><Icon name="shield-check" size={13} />{t("prescriptionRequired")}</span> : null}
        <span className={styles.open}>{t("open")}<Icon name="arrow-up-left" size={14} /></span>
      </Link>)}
    </section>}
  </main>;
}
