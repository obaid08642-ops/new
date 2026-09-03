import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import styles from "../prescriptions.module.css";

type Props = { params: Promise<{ locale: string; prescriptionId: string }> };

export default async function PrescriptionDetailPage({ params }: Props) {
  const { locale, prescriptionId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(prescriptionId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Prescriptions");
  await requirePatientAccess(locale);

  return <main className={`main ${styles.page}`}>
    <section className={styles.state} role="alert">
      <FileText size={25} aria-hidden="true" />
      <h1>{t("detailTitle")}</h1>
      <p>{t("contractPending")}</p>
      <Link className={styles.date} href={`/${locale}/prescriptions`}>{t("back")}</Link>
    </section>
  </main>;
}
