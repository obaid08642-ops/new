import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { callPatientApi } from "@/lib/api/upstream";
import { isLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/format-date";
import { readReportDetail } from "@/lib/medical-reports/rest";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice, SectionCard } from "@/components-next/consult/consult-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; reportId: string }> };
const ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * PT-08: one medical report, drawn like the invoice: serial, issue date, doctor with specialty and licence, the patient and the ID
 * number in full, the consultation, the recommended rest period, the reason (the diagnosis only when the doctor chose to show it),
 * the Seha state, the PDF and the public verify page. Revoked reports say so with the reason. Never called "sick leave";
 * official sick leave is issued through Seha and this is not a government document (the footer says so).
 */
export default async function MedicalReportPage({ params }: Props) {
  const { locale, reportId } = await params;
  if (!isLocale(locale) || !ID.test(reportId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MedicalReport");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/sick-leaves/${encodeURIComponent(reportId)}`, { cache: "no-store" }, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 404 || response.status === 403) notFound();
  const backHref = `/${locale}/medical-reports`;
  const report = response.ok ? readReportDetail(await response.json().catch(() => null)) : null;
  if (!report) {
    return (
      <ConsultPage locale={locale} title={t("detailTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("loadError")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const date = (value: string | null, long = false) => formatDate(locale, value, long ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
  const specialty = locale === "ar" ? report.specialtyAr ?? report.specialtyEn : report.specialtyEn ?? report.specialtyAr;
  const none = t("notAvailable");
  const line = (label: string, value: string | number | null) => (
    <p className={styles.line}><strong>{label}</strong>: {value ?? none}</p>
  );
  return (
    <ConsultPage locale={locale} title={t("detailTitle")} backHref={backHref}>
      {report.revoked ? <Notice warn>{report.revokeReason ? `${t("revoked")}: ${report.revokeReason}` : t("revoked")}</Notice> : null}
      <SectionCard id="report-main" title={report.serial ?? t("detailTitle")}>
        {line(t("issuedAt"), date(report.issuedAt, true))}
        {line(t("doctor"), report.doctorName)}
        {line(t("specialty"), specialty)}
        {line(t("licence"), report.licenceNo)}
        {line(t("patient"), report.patientName)}
        {line(t("idNumber"), report.idNumber)}
        {line(t("consultation"), date(report.consultationAt))}
        {line(t("bookingRef"), report.bookingRef)}
      </SectionCard>
      <SectionCard id="report-rest" title={t("restPeriod")}>
        {line(t("from"), date(report.from))}
        {line(t("to"), date(report.to))}
        {line(t("days"), report.days)}
        {report.reason ? line(t("reason"), report.reason) : null}
        {report.diagnosis ? line(t("diagnosis"), report.diagnosis) : null}
      </SectionCard>
      <SectionCard id="report-seha">
        <p className={styles.line}>{report.seha.status === "registered" ? t("sehaRegistered", { number: report.seha.number ?? "" }) : t("sehaPending")}</p>
        {report.seha.status === "registered" ? <p className={styles.line}>{t("sehaVerify")}</p> : null}
        <p className={styles.line}>{t("footer")}</p>
      </SectionCard>
      <ButtonLink href={`/api/patient/care/sick-leaves/${encodeURIComponent(report.id)}/pdf`} label={t("downloadPdf")} variant="primary" fullWidth />
      {report.verifyCode ? <ButtonLink href={`/${locale}/verify/sick-leave/${encodeURIComponent(report.verifyCode)}`} label={t("verifyLink")} variant="outline" fullWidth /> : null}
    </ConsultPage>
  );
}
