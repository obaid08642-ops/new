import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicineDetail, parseMedicineId } from "@/lib/api/medicines";
import { getPublicMedicine } from "@/lib/api/public-medicines-server";
import { JsonLd } from "@/components-next/json-ld";
import { isLocale } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; medicineId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, medicineId } = await params;
  if (!isLocale(locale) || !parseMedicineId(medicineId).success) return {};
  const response = await getPublicMedicine(medicineId);
  const medicine = response.ok ? extractMedicineDetail(await response.json().catch(() => null)) : null;
  if (!medicine) return { robots: { index: false, follow: false } };
  const name = locale === "ar" ? medicine.nameAr || medicine.nameEn || "عنصر كتالوج" : medicine.nameEn || medicine.nameAr || "Catalogue item";
  const canonical = localizedUrl(locale, `/medicines/${medicineId}`);
  return {
    title: name,
    description: locale === "ar" ? `معلومات كتالوج منشورة عن ${name} من نبض بلس.` : `Published catalogue information about ${name} from Nabd Plus.`,
    alternates: { canonical, languages: { ar: localizedUrl("ar", `/medicines/${medicineId}`), en: localizedUrl("en", `/medicines/${medicineId}`), "x-default": localizedUrl("ar", `/medicines/${medicineId}`) } },
    robots: { index: false, follow: false },
  };
}

export default async function MedicineDetailPage({ params }: Props) {
  const { locale, medicineId } = await params;
  if (!isLocale(locale) || !parseMedicineId(medicineId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("PublicMedicines");
  const response = await getPublicMedicine(medicineId);
  if (response.status === 404) notFound();
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;
  const medicine = extractMedicineDetail(await response.json().catch(() => null));
  if (!medicine) notFound();
  const name = locale === "ar" ? medicine.nameAr || medicine.nameEn || t("untitled") : medicine.nameEn || medicine.nameAr || t("untitled");
  const canonical = localizedUrl(locale, `/medicines/${medicine.id}`);
  const schema = { "@context": "https://schema.org", "@type": "WebPage", name, url: canonical, inLanguage: locale, mainEntity: { "@type": "Thing", name } };
  return <main className="main dashboard"><JsonLd data={schema} /><Link className="back-link" href={`/${locale}/medicine-catalog`}>{t("back")}</Link><div className="eyebrow">{t("eyebrow")}</div><h1>{name}</h1><section className="status-card"><dl className="order-detail">{medicine.activeIngredient ? <div><dt>{t("activeIngredient")}</dt><dd>{medicine.activeIngredient}</dd></div> : null}{medicine.genericName ? <div><dt>{t("genericName")}</dt><dd>{medicine.genericName}</dd></div> : null}{medicine.form ? <div><dt>{t("form")}</dt><dd>{medicine.form}</dd></div> : null}{medicine.strength ? <div><dt>{t("strength")}</dt><dd>{medicine.strength}</dd></div> : null}{medicine.requiresPrescription !== undefined ? <div><dt>{t("prescription")}</dt><dd>{medicine.requiresPrescription ? t("yes") : t("no")}</dd></div> : null}</dl><p>{t("detailNotice")}</p></section></main>;
}
