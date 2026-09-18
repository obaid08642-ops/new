import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { Pill } from "lucide-react";
import { PharmacyRequestForm } from "@/components-next/pharmacy-request-form";
import styles from "./request.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function PharmacyRequestPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("PharmacyRequest");
  return <main className={`main ${styles.page}`}>
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.iconWrap} aria-hidden="true"><Pill size={22} /></span>
        <div className={styles.headText}>
          <h1>{t("title")}</h1>
          <p className={styles.sub}>{t("subtitle")}</p>
        </div>
      </div>
      <PharmacyRequestForm locale={locale} labels={{
        name: t("name"), namePh: t("namePh"), details: t("details"), detailsPh: t("detailsPh"),
        submit: t("submit"), submitting: t("submitting"), error: t("error"), success: t("success"),
      }} />
    </section>
  </main>;
}
