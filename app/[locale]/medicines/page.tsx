import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicineRows, parseMedicineSearch } from "@/lib/api/medicines";
import { getPatientMedicines } from "@/lib/api/medicines-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

export default async function MedicinesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Medicines");
  const search = parseMedicineSearch(await searchParams);
  const token = await requirePatientAccess(locale);
  const response = await getPatientMedicines(token, search);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const medicines = extractMedicineRows(await response.json().catch(() => null));
  const nameForLocale = (medicine: typeof medicines[number]) => locale === "ar" ? medicine.nameAr || medicine.nameEn || t("untitled") : medicine.nameEn || medicine.nameAr || t("untitled");
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1><form className="catalog-search" action={`/${locale}/medicines`} method="get"><label className="field"><span>{t("searchLabel")}</span><input name="q" maxLength={80} defaultValue={search.q} autoComplete="off" /></label><button className="button button-primary" type="submit">{t("search")}</button></form>{medicines.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="medicine-grid" aria-label={t("title")}>{medicines.map((medicine) => <Link className="medicine-card" key={medicine.id} href={`/${locale}/medicines/${medicine.id}`}><strong>{nameForLocale(medicine)}</strong>{medicine.activeIngredient ? <span>{medicine.activeIngredient}</span> : null}{medicine.form || medicine.strength ? <span>{[medicine.form, medicine.strength].filter(Boolean).join(" · ")}</span> : null}{medicine.requiresPrescription === true ? <em>{t("prescriptionRequired")}</em> : null}<span className="medicine-open">{t("open")}</span></Link>)}</section>}</main>;
}
