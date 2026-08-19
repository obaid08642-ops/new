import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicineDetail, parseMedicineId } from "@/lib/api/medicines";
import { getPatientMedicine } from "@/lib/api/medicines-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string; medicineId: string }> };

export default async function MedicineDetailPage({ params }: Props) {
  const { locale, medicineId } = await params;
  if (!isLocale(locale) || !parseMedicineId(medicineId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Medicines");
  const token = await requirePatientAccess(locale);
  const response = await getPatientMedicine(token, medicineId);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p></section></main>;
  const medicine = extractMedicineDetail(await response.json().catch(() => null));
  if (!medicine) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p></section></main>;
  const name = locale === "ar" ? medicine.nameAr || medicine.nameEn || t("untitled") : medicine.nameEn || medicine.nameAr || t("untitled");
  return <main className="main dashboard"><Link className="back-link" href={`/${locale}/medicines`}>{t("back")}</Link><div className="eyebrow">{t("eyebrow")}</div><h1>{name}</h1><section className="status-card"><dl className="order-detail">{medicine.activeIngredient ? <div><dt>{t("activeIngredient")}</dt><dd>{medicine.activeIngredient}</dd></div> : null}{medicine.genericName ? <div><dt>{t("genericName")}</dt><dd>{medicine.genericName}</dd></div> : null}{medicine.form ? <div><dt>{t("form")}</dt><dd>{medicine.form}</dd></div> : null}{medicine.strength ? <div><dt>{t("strength")}</dt><dd>{medicine.strength}</dd></div> : null}{medicine.requiresPrescription !== undefined ? <div><dt>{t("prescription")}</dt><dd>{medicine.requiresPrescription ? t("yes") : t("no")}</dd></div> : null}</dl><p>{t("detailNotice")}</p></section></main>;
}
