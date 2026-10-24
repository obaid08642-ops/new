import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareService, parseHomeCareServiceId } from "@/lib/api/home-care-services";
import { getPatientHomeCareService } from "@/lib/api/home-care-services-server";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatAddressLine, hasLocation, parseDeliveryAddresses } from "@/lib/pharmacy/delivery-address";
import { isLocale } from "@/lib/i18n";
import { parseInsuranceOnFile, parseNurse, type InsuranceOnFile } from "@/lib/nursing/nurse";
import { servicePayFlow } from "@/lib/nursing/pay-flow";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Facts, Hero, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { NURSING, NurseFacts } from "@/components-next/nursing/nursing-parts";
import { pickText } from "@/components-next/diagnostics/diag-parts";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { HomeCareBookingForm } from "@/components-next/home-care-booking-form";

type Props = { params: Promise<{ locale: string; nurseId: string }>; searchParams?: Promise<{ serviceId?: string; pay?: string }> };

const NURSE_ID = /^[A-Za-z0-9-]{1,64}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "NursingWeb" });
  return { title: t("nurseTitle"), robots: { index: false, follow: false } };
}

/**
 * The nurse and the booking part (the app's nurse-profile, board DoctorFull): who the nurse is (GET /home-care/providers/:id), then the day,
 * the nurse's own free times, the saved address and how the visit is paid, with the amount on the button. It books one service
 * (`serviceId`); without one it asks to choose the service first.
 */
export default async function NurseProfilePage({ params, searchParams }: Props) {
  const { locale, nurseId } = await params;
  if (!isLocale(locale) || !NURSE_ID.test(nurseId)) notFound();
  setRequestLocale(locale);
  const query = (await searchParams) ?? {};
  const serviceId = (query.serviceId ?? "").trim();
  const pay = servicePayFlow(query.pay);
  const t = await getTranslations("NursingWeb");
  const token = await requirePatientAccess(locale);
  const back = serviceId && parseHomeCareServiceId(serviceId).success
    ? `/${locale}/home-care/services/${encodeURIComponent(serviceId)}/book${pay === "insurance" ? "?pay=insurance" : ""}`
    : `/${locale}/home-care/providers`;
  const hasService = serviceId.length > 0 && parseHomeCareServiceId(serviceId).success;

  const [nurseRes, serviceRes, addressRes] = await Promise.all([
    callPatientApi(`/home-care/providers/${encodeURIComponent(nurseId)}${hasService ? `?serviceId=${encodeURIComponent(serviceId)}` : ""}`, { cache: "no-store" }, token),
    hasService ? getPatientHomeCareService(serviceId, token) : Promise.resolve(null),
    getPatientAddresses(token),
  ]);
  if (nurseRes.status === 401 || serviceRes?.status === 401 || addressRes.status === 401) redirect(`/${locale}/login`);
  if (nurseRes.status === 404) notFound();
  const nurse = nurseRes.ok ? parseNurse(await nurseRes.json().catch(() => null)) : null;
  if (!nurse) {
    return (
      <ConsultPage locale={locale} title={t("nurseTitle")} backHref={back}>
        <ConsultState kind="error" title={t("nurseUnavailableTitle")} body={t("nurseUnavailableBody")} retryLabel={t("retry")} actionLabel={t("back")} actionHref={back} />
      </ConsultPage>
    );
  }
  const name = pickText(locale, nurse.nameAr, nurse.nameEn) ?? t("nurseTitle");
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const facts: FactRow[] = [
    ...(nurse.degree ? [{ label: t("degreeLabel"), value: nurse.degree, icon: "identification-card" as const, tone: NURSING.tone }] : []),
    ...(nurse.years !== undefined ? [{ label: t("experienceLabel"), value: t("yearsLine", { count: nurse.years }), icon: "clock-counter-clockwise" as const, tone: NURSING.tone }] : []),
  ];
  const chips = [nurse.rating !== undefined ? t("ratingLine", { rating: number.format(nurse.rating), count: number.format(nurse.reviewCount ?? 0) }) : ""].filter(Boolean);
  const head = (
    <>
      <Hero icon="user-circle" tone={NURSING.tone} title={name} sub={nurse.facility}>
        <NurseFacts facts={chips} available={nurse.availableNow === undefined ? undefined : { label: nurse.availableNow ? t("availableNow") : t("notNow"), good: nurse.availableNow }} />
      </Hero>
      {facts.length > 0 ? <SectionCard id="nurse-facts"><Facts rows={facts} label={t("nurseTitle")} /></SectionCard> : null}
    </>
  );

  if (!hasService) {
    return (
      <ConsultPage locale={locale} title={t("nurseTitle")} backHref={back}>
        {head}
        <ConsultState kind="empty" icon={NURSING.icon} tone={NURSING.tone} title={t("nurseChooseService")} body={t("nurseChooseServiceBody")} />
        <ButtonLink href={`/${locale}/home-care`} label={t("browseServices")} fullWidth />
      </ConsultPage>
    );
  }
  const service = serviceRes && serviceRes.ok ? extractHomeCareService(await serviceRes.json().catch(() => null)) : null;
  if (serviceRes && (serviceRes.status === 403 || serviceRes.status === 404)) notFound();
  if (!service || !addressRes.ok) {
    return (
      <ConsultPage locale={locale} title={t("nurseTitle")} backHref={back}>
        {head}
        <ConsultState kind="error" title={t("serviceUnavailableTitle")} body={t("serviceUnavailableBody")} retryLabel={t("retry")} actionLabel={t("back")} actionHref={back} />
      </ConsultPage>
    );
  }
  const located = parseDeliveryAddresses(await addressRes.json().catch(() => null)).filter(hasLocation);
  located.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const addresses = located.map((a) => ({ id: a.id, label: [a.label, formatAddressLine(a, locale)].filter(Boolean).join(" · ") || a.id }));
  // The insurance flow reads the policy on file before sending, as the app does (GET /insurance/coverage-check).
  let insuranceOnFile: InsuranceOnFile | null = null;
  if (service.insuranceAvailable) {
    const coverage = await callPatientApi(`/insurance/coverage-check?provider_id=${encodeURIComponent(nurseId)}&service_type=home_nursing`, { cache: "no-store" }, token).catch(() => null);
    insuranceOnFile = coverage && coverage.ok ? parseInsuranceOnFile(await coverage.json().catch(() => null)) : null;
  }
  const serviceName = pickText(locale, service.nameAr, service.nameEn) ?? t("serviceTitle");
  return (
    <ConsultPage locale={locale} title={t("nurseTitle")} backHref={back}>
      {head}
      <SectionCard id="nurse-service" title={t("formService")}><p>{serviceName}</p></SectionCard>
      <HomeCareBookingForm
        locale={locale}
        serviceId={serviceId}
        nurses={[{ id: nurse.id, name, detail: nurse.facility }]}
        addresses={addresses}
        insurance={Boolean(service.insuranceAvailable)}
        price={nurse.price ?? service.price}
        initialMethod={pay}
        insuranceOnFile={insuranceOnFile}
      />
    </ConsultPage>
  );
}
