import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsInsuranceApprovalClient } from "@/components-next/diagnostics-insurance-approval-client";
import { ConsultPage } from "@/components-next/consult/consult-page";
import styles from "@/components-next/diagnostics/diag.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderId?: string; id?: string; labName?: string; visitType?: string }>;
};
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The insurance approval of a booking (canvas/OrderTracking): live decision, what is covered, the cash choice and the totals. Everything is read from the booking by DiagnosticsInsuranceApprovalClient; the page is its frame. */
export default async function DiagnosticsInsuranceApprovalPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const orderId = (sp.orderId || sp.id || "").trim();
  if (!isLocale(locale) || !idPattern.test(orderId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  await requirePatientAccess(locale);
  return (
    <ConsultPage locale={locale} title={t("approvalTitle")} backHref={`/${locale}/diagnostics/bookings`}>
      <p className={styles.flowNote}>{t("approvalSub")}</p>
      <DiagnosticsInsuranceApprovalClient orderId={orderId} labName={(sp.labName || "").trim() || t("approvalLabFallback")} visitType={(sp.visitType || "clinic").trim()} locale={locale} />
    </ConsultPage>
  );
}
