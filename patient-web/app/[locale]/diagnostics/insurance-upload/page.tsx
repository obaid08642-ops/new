import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsDocumentUpload } from "@/components-next/diagnostics-document-upload";
import { ConsultPage } from "@/components-next/consult/consult-page";
import styles from "@/components-next/diagnostics/diag.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bookingId?: string }> };

/** Upload an insurance document for a booking (canvas/RxUpload): the frame and the line about home collection; the upload is DiagnosticsDocumentUpload. */
export default async function DiagnosticsInsuranceUploadPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const bookingId = (sp.bookingId || "").trim();
  if (!isLocale(locale) || !bookingId) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const t = await getTranslations("DiagWeb");

  return (
    <ConsultPage locale={locale} title={t("uploadTitle")} backHref={`/${locale}/diagnostics/bookings`}>
      <p className={styles.flowNote}>{t("uploadSub")}</p>
      <DiagnosticsDocumentUpload locale={locale} bookingId={bookingId} />
    </ConsultPage>
  );
}
