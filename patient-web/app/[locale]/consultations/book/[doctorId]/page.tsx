import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { doctorDisplayName, extractDoctor, parseDoctorId } from "@/lib/api/doctors";
import { getPublicDoctor } from "@/lib/api/doctors-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { JsonLd } from "@/components-next/json-ld";
import { physician } from "@/lib/seo/structured-data";
import { BookingFlow } from "@/components-next/booking-flow";
import { getPatientAddresses } from "@/lib/api/addresses-server";
import { formatAddressLine, hasLocation, parseDeliveryAddresses } from "@/lib/pharmacy/delivery-address";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { policyLines } from "@/components-next/consult/policy-lines";
import { getCancellationPolicy } from "@/lib/consult/cancellation-policy";
import { readTelehealthConsent } from "@/lib/legal/telehealth-consent";
import { cookies } from "next/headers";
import { getPatientFamilyMembers } from "@/lib/api/family-server";
import { extractFamilyMembers } from "@/lib/api/family";
import { familyMemberRef } from "@/lib/api/family-member-ref";
import { getPatientInsurancePolicy } from "@/lib/api/insurance-server";
import { parseInsuranceSummary } from "@/lib/api/insurance";
import { BOOKING_FOR_COOKIE, isMemberRef } from "@/lib/consult/booking-for";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string; doctorId: string }>; searchParams?: Promise<{ service_type?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, doctorId } = await params;
  if (!isLocale(locale) || !parseDoctorId(doctorId).success) return {};
  const t = await getTranslations({ locale, namespace: "BookConsultation" });
  const canonical = localizedUrl(locale, `/consultations/book/${encodeURIComponent(doctorId)}`);
  return {
    title: t("title"),
    alternates: { canonical, languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/consultations/book/${encodeURIComponent(doctorId)}`)])), "x-default": localizedUrl("ar", `/consultations/book/${encodeURIComponent(doctorId)}`) } },
    robots: { index: false, follow: false },
  };
}

/** Book a consultation (canvas/BookingConfirm): the doctor, the visit type, day, time and payment, and the confirm bar. */
export default async function BookConsultationPage({ params, searchParams }: Props) {
  const { locale, doctorId } = await params;
  const initialType = (await searchParams)?.service_type;
  if (!isLocale(locale) || !parseDoctorId(doctorId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("BookConsultation");
  const token = await requirePatientAccess(locale);
  const response = await getPublicDoctor(doctorId);
  if (response?.status === 401) redirect(`/${locale}/login`);
  if (response?.status === 404) notFound();
  const doctor = response?.ok ? extractDoctor(await response.json().catch(() => null)) : null;
  if (!doctor) {
    // no form under "doctor unavailable": say so, with a retry and the way back to the doctors list
    const rs = await getTranslations("RouteState");
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={`/${locale}/consultations/doctors`} hideTabs>
        <ConsultState kind="error" title={t("doctorUnavailable")} body={t("doctorUnavailableBody")} retryLabel={rs("retry")} actionLabel={t("backToDoctors")} actionHref={`/${locale}/consultations/doctors`} />
      </ConsultPage>
    );
  }
  // decision 26: the cancellation and refund terms are shown before payment, from the server's numbers
  const c = await getTranslations("ConsultWeb");
  const policy = { title: c("policyTitle"), lines: policyLines(c, await getCancellationPolicy(token)) };
  const name = doctorDisplayName(doctor, locale) || t("doctorUnavailable");
  // journeys#29: a home visit goes to one of the patient's saved addresses that has a map location (the app's address book)
  const addressRes = await getPatientAddresses(token);
  const located = addressRes.ok ? parseDeliveryAddresses(await addressRes.json().catch(() => null)).filter(hasLocation) : [];
  located.sort((x, y) => Number(y.isDefault) - Number(x.isDefault));
  const homeAddresses = located.map((a) => ({ id: a.id, label: [a.label, formatAddressLine(a, locale)].filter(Boolean).join(" · ") || a.id, line: formatAddressLine(a, locale) || a.label || "", lat: a.lat, lng: a.lng }));
  // the app's "booking for <member>": the member page remembers who; only a member of the signed-in family is accepted
  const ref = (await cookies()).get(BOOKING_FOR_COOKIE)?.value;
  let bookingFor: { id: string; name: string } | null = null;
  if (isMemberRef(ref)) {
    const membersRes = await getPatientFamilyMembers(token).catch(() => null);
    const member = membersRes?.ok ? extractFamilyMembers(await membersRes.json().catch(() => null)).find((x) => familyMemberRef(x.id) === ref) : undefined;
    if (member) bookingFor = { id: member.id, name: member.displayName || (await getTranslations("FamilyWeb"))("member") };
  }
  // insurance readiness (the app checks the saved policy before it offers the insurance request)
  const policyRes = await getPatientInsurancePolicy(token).catch(() => null);
  const summary = policyRes?.ok ? parseInsuranceSummary(await policyRes.json().catch(() => null)) : null;
  const insurance = { ready: Boolean(summary?.hasPolicy && (summary.policyNumber || summary.memberId || summary.companyName)), memberId: summary?.policyNumber || summary?.memberId };
  return (
    <BookingFlow
      bookingFor={bookingFor}
      insurance={insurance}      doctorId={doctorId}
      locale={locale}
      doctor={doctor}
      initialType={initialType}
      policy={policy}
      homeAddresses={homeAddresses}
      consent={await readTelehealthConsent(locale)}
      top={<JsonLd data={physician({ name, locale, path: `/consultations/doctors/${encodeURIComponent(doctorId)}`, specialty: doctor?.specialty })} />}
    />
  );
}
