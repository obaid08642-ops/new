import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicineRows, parseMedicineSearch } from "@/lib/api/medicines";
import { getPublicMedicines } from "@/lib/api/public-medicines-server";
import { JsonLd } from "@/components-next/json-ld";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { RetryButton } from "@/components-next/retry-button";
import { ArrowUpLeft, Pill, Search, ShieldCheck } from "lucide-react";
import styles from "./medicine-catalog.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const search = parseMedicineSearch(await searchParams);
  const canonical = localizedUrl(locale, "/medicine-catalog");
  return {
    title: locale === "ar" ? "كتالوج منشور" : "Published catalogue",
    description: locale === "ar" ? "كتالوج العناصر المنشورة من نبض بلس." : "Published catalogue information from Nabd Plus.",
    alternates: { canonical, languages: { ...Object.fromEntries(locales.map((supportedLocale) => [supportedLocale, localizedUrl(supportedLocale, "/medicine-catalog")])), "x-default": localizedUrl("ar", "/medicine-catalog") } },
    robots: { index: false, follow: false },
  };
}

export default async function PublicMedicineCatalogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  setRequestLocale(locale);
  const t = await getTranslations("PublicMedicines");
  const search = parseMedicineSearch(await searchParams);
  const response = await getPublicMedicines(search);
  if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const medicines = extractMedicineRows(await response.json().catch(() => null));
  const nameForLocale = (medicine: typeof medicines[number]) => locale === "ar" ? medicine.nameAr || medicine.nameEn || t("untitled") : medicine.nameEn || medicine.nameAr || t("untitled");
  const canonical = localizedUrl(locale, "/medicine-catalog");
  const itemList = medicines.map((medicine, index) => ({ "@type": "ListItem", position: index + 1, url: localizedUrl(locale, `/medicines/${medicine.id}`), name: nameForLocale(medicine) }));
  return <main className={`main ${styles.page}`}><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "ItemList", itemListElement: itemList } }} /><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("body")}</p></div><span className={styles.heroIcon}><Pill size={27} aria-hidden="true" /></span></section><form className={styles.search} action={`/${locale}/medicine-catalog`} method="get"><label className={styles.field}><span>{t("searchLabel")}</span><span className={styles.fieldInput}><Search size={18} aria-hidden="true" /><input name="q" maxLength={80} defaultValue={search.q} autoComplete="off" /></span></label><button className={`button button-primary ${styles.submit}`} type="submit"><Search size={17} aria-hidden="true" />{t("search")}</button></form>{medicines.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Pill size={24} aria-hidden="true" /></span><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{medicines.map((medicine) => <Link className={styles.card} key={medicine.id} href={`/${locale}/medicines/${medicine.id}`}><span className={styles.cardTop}><span className={styles.medicineIcon}><Pill size={20} aria-hidden="true" /></span><ArrowUpLeft className={styles.openIcon} size={17} aria-hidden="true" /></span><strong className={styles.name}>{nameForLocale(medicine)}</strong>{medicine.activeIngredient ? <span className={styles.detail}>{medicine.activeIngredient}</span> : null}{medicine.form || medicine.strength ? <span className={styles.detail}>{[medicine.form, medicine.strength].filter(Boolean).join(" · ")}</span> : null}{medicine.requiresPrescription === true ? <span className={styles.prescription}><ShieldCheck size={13} aria-hidden="true" />{t("prescriptionRequired")}</span> : null}<span className={styles.open}>{t("open")}<ArrowUpLeft size={14} aria-hidden="true" /></span></Link>)}</section>}<p className={styles.notice}>{t("notice")}</p></main>;
}
