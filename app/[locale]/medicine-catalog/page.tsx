import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicineRows, parseMedicineSearch } from "@/lib/api/medicines";
import { getPublicMedicines } from "@/lib/api/public-medicines-server";
import { JsonLd } from "@/components-next/json-ld";
import { isLocale } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const search = parseMedicineSearch(await searchParams);
  const canonical = localizedUrl(locale, "/medicine-catalog");
  return {
    title: locale === "ar" ? "كتالوج منشور" : "Published catalogue",
    description: locale === "ar" ? "كتالوج العناصر المنشورة من نبض بلس." : "Published catalogue information from Nabd Plus.",
    alternates: { canonical, languages: { ar: localizedUrl("ar", "/medicine-catalog"), en: localizedUrl("en", "/medicine-catalog"), "x-default": localizedUrl("ar", "/medicine-catalog") } },
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
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;
  const medicines = extractMedicineRows(await response.json().catch(() => null));
  const nameForLocale = (medicine: typeof medicines[number]) => locale === "ar" ? medicine.nameAr || medicine.nameEn || t("untitled") : medicine.nameEn || medicine.nameAr || t("untitled");
  const canonical = localizedUrl(locale, "/medicine-catalog");
  const itemList = medicines.map((medicine, index) => ({ "@type": "ListItem", position: index + 1, url: localizedUrl(locale, `/medicines/${medicine.id}`), name: nameForLocale(medicine) }));
  return <main className="main dashboard"><JsonLd data={{ "@context": "https://schema.org", "@type": "WebPage", url: canonical, inLanguage: locale, name: t("title"), mainEntity: { "@type": "ItemList", itemListElement: itemList } }} /><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1><p className="profile-intro">{t("body")}</p><form className="catalog-search" action={`/${locale}/medicine-catalog`} method="get"><label className="field"><span>{t("searchLabel")}</span><input name="q" maxLength={80} defaultValue={search.q} autoComplete="off" /></label><button className="button button-primary" type="submit">{t("search")}</button></form>{medicines.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="medicine-grid" aria-label={t("title")}>{medicines.map((medicine) => <Link className="medicine-card" key={medicine.id} href={`/${locale}/medicines/${medicine.id}`}><strong>{nameForLocale(medicine)}</strong>{medicine.activeIngredient ? <span>{medicine.activeIngredient}</span> : null}{medicine.form || medicine.strength ? <span>{[medicine.form, medicine.strength].filter(Boolean).join(" · ")}</span> : null}{medicine.requiresPrescription === true ? <em>{t("prescriptionRequired")}</em> : null}<span className="medicine-open">{t("open")}</span></Link>)}</section>}<p className="privacy-notice">{t("notice")}</p></main>;
}
