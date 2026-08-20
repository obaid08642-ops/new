import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicineDetail, parseMedicineId } from "@/lib/api/medicines";
import { getPublicMedicine } from "@/lib/api/public-medicines-server";
import { JsonLd } from "@/components-next/json-ld";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { RetryButton } from "@/components-next/retry-button";
import { ChevronLeft, Pill, ShieldCheck } from "lucide-react";
import styles from "./medicine-detail.module.css";

type Props = { params: Promise<{ locale: string; medicineId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, medicineId } = await params;
  if (!isLocale(locale) || !parseMedicineId(medicineId).success) return {};
  const response = await getPublicMedicine(medicineId);
  const medicine = response?.ok ? extractMedicineDetail(await response.json().catch(() => null)) : null;
  if (!medicine) return { robots: { index: false, follow: false } };
  const name = locale === "ar" ? medicine.nameAr || medicine.nameEn || "عنصر كتالوج" : medicine.nameEn || medicine.nameAr || "Catalogue item";
  const canonical = localizedUrl(locale, `/medicines/${medicineId}`);
  return {
    title: name,
    description: locale === "ar" ? `معلومات كتالوج منشورة عن ${name} من نبض بلس.` : `Published catalogue information about ${name} from Nabd Plus.`,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((supportedLocale) => [supportedLocale, localizedUrl(supportedLocale, `/medicines/${medicineId}`)])),
        "x-default": localizedUrl("ar", `/medicines/${medicineId}`),
      },
    },
    // The legacy public catalogue has no reliable entity_type/is_published contract.
    // It remains noindex until G-SEO-002 delivers a separately classified public DTO.
    robots: { index: false, follow: false },
  };
}

export default async function MedicineDetailPage({ params }: Props) {
  const { locale, medicineId } = await params;
  if (!isLocale(locale) || !parseMedicineId(medicineId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("PublicMedicines");
  const response = await getPublicMedicine(medicineId);
  if (response?.status === 404) notFound();
  if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Pill size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const medicine = extractMedicineDetail(await response.json().catch(() => null));
  if (!medicine) notFound();
  const name = locale === "ar" ? medicine.nameAr || medicine.nameEn || t("untitled") : medicine.nameEn || medicine.nameAr || t("untitled");
  const canonical = localizedUrl(locale, `/medicines/${medicine.id}`);
  const schema = { "@context": "https://schema.org", "@type": "MedicalWebPage", name, url: canonical, inLanguage: locale, mainEntity: { "@type": "Thing", name } };
  const facts = [
    medicine.activeIngredient ? [t("activeIngredient"), medicine.activeIngredient] : null,
    medicine.genericName ? [t("genericName"), medicine.genericName] : null,
    medicine.form ? [t("form"), medicine.form] : null,
    medicine.strength ? [t("strength"), medicine.strength] : null,
    medicine.requiresPrescription !== undefined ? [t("prescription"), medicine.requiresPrescription ? t("yes") : t("no")] : null,
  ].filter((fact): fact is [string, string] => Boolean(fact));
  return <main className={`main ${styles.page}`}><JsonLd data={schema} />
    <Link className={styles.back} href={`/${locale}/medicine-catalog`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <section className={styles.hero}><div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{name}</h1></div><span className={styles.heroIcon}><Pill size={28} aria-hidden="true" /></span></section>
    <section className={styles.detail} aria-label={name}><dl className={styles.grid}>{facts.map(([label, value]) => <div className={styles.item} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className={styles.notice}>{t("detailNotice")}</p></section>
  </main>;
}
