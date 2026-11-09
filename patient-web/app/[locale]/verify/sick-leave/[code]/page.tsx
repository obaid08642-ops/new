import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/format-date";
import { isVerifyCode, readVerification } from "@/lib/medical-reports/rest";
import { callPatientApi } from "@/lib/api/upstream";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice, SectionCard } from "@/components-next/consult/consult-parts";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; code: string }> };

/**
 * PT-08: the page behind the QR code of a medical report. Public, no sign-in, and only what GET /verify/sick-leave/:code returns:
 * valid or revoked, the patient's initials, the dates and whether the report is registered on Seha. Never a name, an ID number, a
 * reason or a diagnosis. Not indexed (it is not a public-indexable path). The code is checked against the backend's alphabet first.
 */
export default async function VerifyMedicalReportPage({ params }: Props) {
  const { locale, code } = await params;
  if (!isLocale(locale) || !isVerifyCode(code)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MedicalReport");
  const response = await callPatientApi(`/verify/sick-leave/${encodeURIComponent(code.toUpperCase())}`, { cache: "no-store" }).catch(() => null);
  if (response && response.status === 404) notFound();
  const result = response && response.ok ? readVerification(await response.json().catch(() => null)) : null;
  if (!result) {
    return (
      <ConsultPage locale={locale} title={t("verifyTitle")} backHref={`/${locale}`}>
        <ConsultState kind="error" title={response?.status === 429 ? t("verifyBusy") : t("loadError")} retryLabel={t("retry")} />
      </ConsultPage>
    );
  }
  const date = (value: string | null) => formatDate(locale, value) ?? t("notAvailable");
  return (
    <ConsultPage locale={locale} title={t("verifyTitle")} backHref={`/${locale}`}>
      {result.valid ? <Notice>{t("verifyValid")}</Notice> : <Notice warn>{t("verifyRevoked")}</Notice>}
      <SectionCard id="verify-main" title={result.serial ?? t("detailTitle")}>
        <p className={styles.line}><strong>{t("verifyInitials")}</strong>: {result.initials ?? t("notAvailable")}</p>
        <p className={styles.line}><strong>{t("from")}</strong>: {date(result.from)}</p>
        <p className={styles.line}><strong>{t("to")}</strong>: {date(result.to)}</p>
        <p className={styles.line}><strong>{t("days")}</strong>: {result.days ?? t("notAvailable")}</p>
        <p className={styles.line}><strong>{t("issuedAt")}</strong>: {date(result.issuedAt)}</p>
        {result.revoked && result.revokedAt ? <p className={styles.line}><strong>{t("revoked")}</strong>: {date(result.revokedAt)}</p> : null}
        <p className={styles.line}>{result.sehaRegistered ? t("verifySehaRegistered") : t("sehaPending")}</p>
      </SectionCard>
      <p className={styles.line}>{t("verifyNote")}</p>
      <p className={styles.line}>{t("footer")}</p>
    </ConsultPage>
  );
}
