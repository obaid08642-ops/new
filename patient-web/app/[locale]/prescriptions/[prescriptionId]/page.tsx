import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, FileText, ShieldCheck, Stethoscope } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractPrescriptionDetail } from "@/lib/api/prescriptions-detail";
import { getPatientPrescription } from "@/lib/api/prescriptions-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "../prescriptions.module.css";

type Props = { params: Promise<{ locale: string; prescriptionId: string }> };

// dd9c105: the patient's own prescription from GET /prescriptions/:id.
export default async function PrescriptionDetailPage({ params }: Props) {
  const { locale, prescriptionId } = await params;
  if (!isLocale(locale) || !/^[0-9a-f-]{36}$/i.test(prescriptionId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Prescriptions");
  const token = await requirePatientAccess(locale);
  const response = await getPatientPrescription(prescriptionId, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const detail = response.ok ? extractPrescriptionDetail(await response.json().catch(() => null)) : null;
  if (!detail) {
    return <main className={`main ${styles.page}`}>
      <section className={styles.state} role="alert">
        <FileText size={25} aria-hidden="true" />
        <h1>{t("unavailableTitle")}</h1>
        <p>{t("unavailable")}</p>
        <RetryButton />
        <Link className={styles.date} href={`/${locale}/prescriptions`}>{t("back")}</Link>
      </section>
    </main>;
  }
  const stateLabels: Record<string, string> = {
    CREATED_BY_DOCTOR: t("stateCreatedByDoctor"),
    UPLOADED_BY_PATIENT: t("stateUploadedByPatient"),
    SENT_TO_PHARMACY: t("stateSentToPharmacy"),
    PARTIALLY_EDITED: t("statePartiallyEdited"),
    VERIFIED_BY_PHARMACIST: t("stateVerifiedByPharmacist"),
    APPROVED: t("stateApproved"),
    DISPENSED: t("stateDispensed"),
    ARCHIVED: t("stateArchived"),
  };
  const issued = detail.issuedAt ? new Date(detail.issuedAt) : null;
  return <main className={`main ${styles.page}`}>
    <Link className={styles.date} href={`/${locale}/prescriptions`}>{t("back")}</Link>
    <section className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("detailEyebrow")}</p>
        <h1>{t("detailTitle")}</h1>
        <strong className={styles.status}>{stateLabels[detail.status] ?? t("stateUnavailable")}</strong>
      </div>
    </section>
    <section className={styles.card} aria-label={t("detailTitle")}>
      <div className={styles.cardBody}>
        {detail.doctor.displayName ? <p><Stethoscope size={15} aria-hidden="true" /> <span dir="auto">{detail.doctor.displayName}</span></p> : null}
        {issued && !Number.isNaN(issued.getTime()) ? <p className={styles.date}><CalendarDays size={15} aria-hidden="true" /> <time dateTime={detail.issuedAt ?? undefined}>{issued.toLocaleDateString(locale === "ar" ? "ar-SA" : locale)}</time></p> : null}
      </div>
    </section>
    <section className={styles.grid} aria-label={t("medications")}>
      <h2>{t("medications")}</h2>
      {detail.items.map((item, index) => (
        <article className={styles.card} key={`${item.name ?? "item"}-${index}`}>
          <div className={styles.cardBody}>
            <strong dir="auto">{item.name ?? t("unnamedMedication")}</strong>
            <dl>
              {item.dose ? <><dt>{t("dose")}</dt><dd dir="auto">{item.dose}</dd></> : null}
              {item.frequency?.every_hours ? <><dt>{t("frequencyHours")}</dt><dd>{item.frequency.every_hours}</dd></> : null}
              {item.frequency?.times_per_day ? <><dt>{t("timesPerDay")}</dt><dd>{item.frequency.times_per_day}</dd></> : null}
              {item.duration != null ? <><dt>{t("durationDays")}</dt><dd>{item.duration}</dd></> : null}
            </dl>
          </div>
        </article>
      ))}
    </section>
    <p className={styles.date}>{t("detailNotice")}</p>
  </main>;
}
