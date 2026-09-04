import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicineRows, parseMedicineSearch, type MedicineRow } from "@/lib/api/medicines";
import { getPatientMedicines } from "@/lib/api/medicines-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { ArrowUpLeft, Pill, Search, ShieldCheck } from "lucide-react";
import styles from "../medicine-catalog/medicine-catalog.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

export default async function MedicinesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Medicines");
  const search = parseMedicineSearch(await searchParams);
  let medicines: MedicineRow[] = [];
  try {
    const { cookies } = await import("next/headers");
    const { authCookieNames } = await import("@/lib/auth/cookies");
    const token = (await cookies()).get(authCookieNames.access)?.value;
    if (token) {
      const response = await getPatientMedicines(token, search);
      if (response && response.ok) {
        medicines = extractMedicineRows(await response.json().catch(() => null));
      }
    }
  } catch {}
  const nameForLocale = (medicine: typeof medicines[number]) => locale === "ar" ? medicine.nameAr || medicine.nameEn || t("untitled") : medicine.nameEn || medicine.nameAr || t("untitled");
  return <main className={`main ${styles.page}`}>
    <section className={styles.hero}>
      <div>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
      </div>
      <span className={styles.heroIcon}><Pill size={27} aria-hidden="true" /></span>
    </section>
    <form className={styles.search} action={`/${locale}/medicines`} method="get">
      <label className={styles.field}>
        <span>{t("searchLabel")}</span>
        <span className={styles.fieldInput}><Search size={18} aria-hidden="true" /><input name="q" maxLength={80} defaultValue={search.q} autoComplete="off" /></span>
      </label>
      <button className={`button button-primary ${styles.submit}`} type="submit"><Search size={17} aria-hidden="true" />{t("search")}</button>
    </form>
    {medicines.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>
      {medicines.map((medicine) => <Link className={styles.card} key={medicine.id} href={`/${locale}/medicines/${medicine.id}`}>
        <span className={styles.cardTop}><span className={styles.medicineIcon}><Pill size={20} aria-hidden="true" /></span><ArrowUpLeft className={styles.openIcon} size={17} aria-hidden="true" /></span>
        <strong className={styles.name}>{nameForLocale(medicine)}</strong>
        {medicine.activeIngredient ? <span className={styles.detail}>{medicine.activeIngredient}</span> : null}
        {medicine.form || medicine.strength ? <span className={styles.detail}>{[medicine.form, medicine.strength].filter(Boolean).join(" · ")}</span> : null}
        {medicine.requiresPrescription === true ? <span className={styles.prescription}><ShieldCheck size={13} aria-hidden="true" />{t("prescriptionRequired")}</span> : null}
        <span className={styles.open}>{t("open")}<ArrowUpLeft size={14} aria-hidden="true" /></span>
      </Link>)}
    </section>}
  </main>;
}
