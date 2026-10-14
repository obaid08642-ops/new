import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientInsuranceRequest } from "@/lib/api/insurance-server";
import { parseInsuranceRequest } from "@/lib/api/insurance-request";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { parseRequestExtras, UUID } from "@/lib/insurance/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { InsuranceRequestView } from "@/components-next/insurance/insurance-request-view";

type Props = { params: Promise<{ locale: string; requestId: string }> };

/**
 * One insurance request (merge map 2, section 6; the approval wait, the co-pay and the payment split are this page): GET
 * /insurance/requests/:id, and its state decides what shows. The amounts, the state and the reason are the server's.
 */
export default async function InsuranceRequestPage({ params }: Props) {
  const { locale, requestId } = await params;
  if (!isLocale(locale) || !UUID.test(requestId)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("InsuranceWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const backHref = `/${locale}/insurance`;

  let response: Response;
  try { response = await getPatientInsuranceRequest(token, requestId); } catch {
    return (
      <ConsultPage locale={locale} title={t("request.pageTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();

  const payload = response.ok ? await response.json().catch(() => null) : null;
  const request = parseInsuranceRequest(payload);
  if (!request) {
    return (
      <ConsultPage locale={locale} title={t("request.pageTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const { price, bookingId } = parseRequestExtras(payload);
  const bookingStatusHref = bookingId ? `/${locale}/consultations/booking-status?appointmentId=${encodeURIComponent(bookingId)}` : null;

  return (
    <ConsultPage locale={locale} title={t("request.pageTitle")} backHref={backHref}>
      <InsuranceRequestView request={request} price={price} bookingStatusHref={bookingStatusHref} />
    </ConsultPage>
  );
}
