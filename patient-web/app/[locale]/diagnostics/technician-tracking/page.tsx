import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsTechnicianTrackingClient } from "@/components-next/diagnostics-technician-tracking-client";
import { ConsultPage } from "@/components-next/consult/consult-page";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bookingId?: string; id?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The collector on the way (canvas/OrderTracking): the frame; the live arrival is read by DiagnosticsTechnicianTrackingClient every 15 s. */
export default async function DiagnosticsTechnicianTrackingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const bookingId = (sp.bookingId || sp.id || "").trim();
  if (!isLocale(locale) || !idPattern.test(bookingId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("DiagWeb");
  await requirePatientAccess(locale);
  return (
    <ConsultPage locale={locale} title={t("technicianTrackingTitle")} backHref={`/${locale}/diagnostics/labs/${encodeURIComponent(bookingId)}`}>
      <DiagnosticsTechnicianTrackingClient bookingId={bookingId} locale={locale} />
    </ConsultPage>
  );
}
