import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractPrescriptionSummaries } from "@/lib/api/prescriptions";
import { getPatientPrescriptions } from "@/lib/api/prescriptions-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { CalendarDays, FileText, ShieldCheck } from "lucide-react";
import styles from "./prescriptions.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function PrescriptionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Prescriptions");
  const token = await requirePatientAccess(locale);
  const response = await getPatientPrescriptions(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileText size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const prescriptions = extractPrescriptionSummaries(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}>
    <section className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
      </div>
      <span className={styles.introIcon}><FileText size={27} aria-hidden="true" /></span>
    </section>
    {prescriptions.length === 0 ? <section className={styles.state}><FileText size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{prescriptions.map((prescription) => <article className={styles.card} key={prescription.id}>
      <span className={styles.cardIcon}><FileText size={19} aria-hidden="true" /></span>
      <div className={styles.cardBody}>
        <strong className={styles.status}>{prescription.state || t("stateUnavailable")}</strong>
        {prescription.doctorName ? <span className={styles.doctor}>{prescription.doctorName}</span> : null}
        <span className={styles.items}>{t("items", { count: prescription.itemCount })}</span>
        {prescription.medicationNames.length ? <span className={styles.medications}>{prescription.medicationNames.join("، ")}</span> : null}
        {prescription.createdAt ? <span className={styles.date}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(prescription.createdAt))}</span> : null}
      </div>
    </article>)}</section>}
    <p className={styles.notice}>{t("notice")}</p>
  </main>;
}
