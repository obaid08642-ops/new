import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { requirePatientAccess } from "@/lib/auth/session";
import { getPublicLabService } from "@/lib/api/labs-server";
import { extractLabService } from "@/lib/api/labs";
import { getCompatibleLabProviders } from "@/lib/api/diagnostics-server";
import { LabBookingForm } from "@/components-next/lab-booking-form";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { LAB, pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ serviceId?: string }> };

/** The booking of one lab test (canvas/BookingConfirm): the test from the live catalogue, the lab that can run it, and the booking form. */
export default async function LabBookingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const { serviceId } = await searchParams;
  if (!serviceId) notFound();
  const token = await requirePatientAccess(locale);
  if (!token) redirect(`/${locale}/login`);
  const response = await getPublicLabService(serviceId);
  if (!response || !response.ok) notFound();
  const service = extractLabService(await response.json().catch(() => null));
  if (!service) notFound();
  const providers = await getCompatibleLabProviders(serviceId);
  const provider = providers[0];
  const t = await getTranslations("DiagWeb");
  const name = pickText(locale, service.nameAr, service.nameEn) ?? t("testTitle");

  return (
    <ConsultPage locale={locale} title={t("bookTitle")} backHref={`/${locale}/diagnostics/labs`}>
      {provider ? (
        <LabBookingForm locale={locale} serviceId={service.id} providerId={provider.id ?? provider.account_id} serviceName={name} homeEligible={Boolean(service.homeVisitSupported)} />
      ) : (
        <ConsultState kind="empty" icon="test-tube" tone={LAB.tone} title={t("noProviderTitle")} body={t("noProviderBody")} actionLabel={t("backToTests")} actionHref={`/${locale}/diagnostics/labs`} />
      )}
    </ConsultPage>
  );
}
