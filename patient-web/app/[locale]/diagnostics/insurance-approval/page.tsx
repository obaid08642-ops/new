import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsInsuranceApprovalClient } from "@/components-next/diagnostics-insurance-approval-client";
import { DiagnosticsDocumentUpload } from "@/components-next/diagnostics-document-upload";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import consult from "@/components-next/consult/consult.module.css";
import styles from "@/components-next/diagnostics/diag.module.css";

const INSURANCE = SERVICE_ICONS.insurance;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string; id?: string; labName?: string; visitType?: string }>;
};
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The insurance step of a booking (canvas/OrderTracking; also the old insurance-upload page): the decision the facility got from the insurer, what is covered, the cash choice and the totals (DiagnosticsInsuranceApprovalClient), and the document upload for the same booking (DiagnosticsDocumentUpload). */
export default async function DiagnosticsInsuranceApprovalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.orderId || sp.id || "").trim();
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  await requirePatientAccess(locale);
  if (!orderId) {
    // Opened from the hub with no booking: the insurance step belongs to a booking, so say so and point to the requests (the pre-booking upload form is a backend/owner item).
    return (
      <ConsultPage locale={locale} title={t("approvalTitle")} backHref={`/${locale}/diagnostics`}>
        <ConsultState kind="empty" icon="shield-check" tone={INSURANCE.tone} title={t("approvalNoOrderTitle")} body={t("approvalNoOrderBody")} actionLabel={t("bookingsTitle")} actionHref={`/${locale}/diagnostics/bookings`} />
      </ConsultPage>
    );
  }
  if (!idPattern.test(orderId)) notFound();
  return (
    <ConsultPage locale={locale} title={t("approvalTitle")} backHref={`/${locale}/diagnostics/bookings`}>
      <p className={styles.flowNote}>{t("approvalSub")}</p>
      <DiagnosticsInsuranceApprovalClient orderId={orderId} labName={(sp.labName || "").trim() || t("approvalLabFallback")} visitType={(sp.visitType || "clinic").trim()} locale={locale} />
      <section aria-labelledby="ins-upload">
        <h2 id="ins-upload" className={consult.sectionTitle}>{t("uploadTitle")}</h2>
        <p className={styles.flowNote}>{t("uploadSub")}</p>
        <DiagnosticsDocumentUpload locale={locale} bookingId={orderId} />
      </section>
    </ConsultPage>
  );
}
