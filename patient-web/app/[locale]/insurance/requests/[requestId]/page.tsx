import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientInsurancePolicy, getPatientInsuranceRequest } from "@/lib/api/insurance-server";
import { parseInsuranceSummary } from "@/lib/api/insurance";
import { parseInsuranceRequest } from "@/lib/api/insurance-request";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { localizedText } from "@/lib/i18n/localized-field";
import { insuranceBookingHref, parseRequestExtras, UUID } from "@/lib/insurance/view";
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
  // No such request, or not the patient's: an in-page state with the way back to the hub (the app's "missing" state), not a 404 page.
  if (response.status === 403 || response.status === 404) {
    return (
      <ConsultPage locale={locale} title={t("request.pageTitle")} backHref={backHref}>
        <ConsultState kind="empty" title={t("request.missingTitle")} body={t("request.missingBody")} actionLabel={t("request.back")} actionHref={backHref} />
      </ConsultPage>
    );
  }

  const payload = response.ok ? await response.json().catch(() => null) : null;
  const request = parseInsuranceRequest(payload);
  if (!request) {
    return (
      <ConsultPage locale={locale} title={t("request.pageTitle")} backHref={backHref}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }
  const { price, bookingId, bookingKind } = parseRequestExtras(payload);
  const bookingStatusHref = bookingId ? insuranceBookingHref(locale, bookingKind, bookingId) : null;

  // The insurer and policy number under the amounts, from the saved policy (the app reads the same GET); left out when it cannot load.
  let policy: { company?: string; number?: string } | undefined;
  try {
    const policyRes = await getPatientInsurancePolicy(token);
    const summary = policyRes.ok ? parseInsuranceSummary(await policyRes.json().catch(() => null)) : null;
    if (summary?.hasPolicy) policy = { company: localizedText({ locale, ar: summary.companyName, en: summary.companyNameEn }), number: summary.policyNumber };
  } catch { /* the panel is optional */ }

  return (
    <ConsultPage locale={locale} title={t("request.pageTitle")} backHref={backHref}>
      <InsuranceRequestView request={request} price={price} bookingStatusHref={bookingStatusHref} policy={policy} />
    </ConsultPage>
  );
}
