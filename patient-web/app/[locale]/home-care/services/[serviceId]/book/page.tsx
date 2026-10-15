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
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Hero } from "@/components-next/consult/consult-parts";
import { NURSING, serviceIcon } from "@/components-next/nursing/nursing-parts";
import { money, pickText } from "@/components-next/diagnostics/diag-parts";
import { HomeCareBookingForm, type BookableNurse } from "@/components-next/home-care-booking-form";

type Props = { params: Promise<{ locale: string; serviceId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "NursingWeb" });
  return { title: t("bookTitle"), robots: { index: false, follow: false } };
}

type NurseRow = { id?: unknown; name_ar?: unknown; name_en?: unknown; name?: unknown; facility_name?: unknown; years_experience?: unknown };
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The approved nurses who offer this service (GET /home-care/providers?type=<service>): `id` is the nurse's account id, which the booking and the slots use. */
function nursesFrom(payload: unknown, locale: string): BookableNurse[] {
  const rows = Array.isArray(payload) ? payload : Array.isArray((payload as { data?: unknown } | null)?.data) ? (payload as { data: unknown[] }).data : [];
  return rows.flatMap((row) => {
    const n = row as NurseRow;
    const id = str(n?.id);
    const name = pickText(locale, str(n?.name_ar) ?? str(n?.name) ?? undefined, str(n?.name_en) ?? undefined);
    if (!id || !name || !/^[A-Za-z0-9-]{1,64}$/.test(id)) return [];
    return [{ id, name, detail: str(n.facility_name) ?? undefined }];
  }).slice(0, 50);
}

/** journeys#60 (issue 1069): book a home nursing service on the website: nurse, day and free time, saved address, card or insurance. */
export default async function HomeCareBookPage({ params }: Props) {
  const { locale, serviceId } = await params;
  if (!isLocale(locale) || !parseHomeCareServiceId(serviceId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("NursingWeb");
  const token = await requirePatientAccess(locale);
  const back = `/${locale}/home-care/services/${encodeURIComponent(serviceId)}`;
  const [serviceRes, nursesRes, addressRes] = await Promise.all([
    getPatientHomeCareService(serviceId, token),
    callPatientApi(`/home-care/providers?type=${encodeURIComponent(serviceId)}`, { cache: "no-store" }, token),
    getPatientAddresses(token),
  ]);
  if (serviceRes.status === 401 || addressRes.status === 401) redirect(`/${locale}/login`);
  if (serviceRes.status === 403 || serviceRes.status === 404) notFound();
  const service = serviceRes.ok ? extractHomeCareService(await serviceRes.json().catch(() => null)) : null;
  if (!service || !nursesRes.ok || !addressRes.ok) {
    return (
      <ConsultPage locale={locale} title={t("bookTitle")} backHref={back}>
        <ConsultState kind="error" title={t("serviceUnavailableTitle")} body={t("serviceUnavailableBody")} retryLabel={t("retry")} actionLabel={t("back")} actionHref={back} />
      </ConsultPage>
    );
  }
  const nurses = nursesFrom(await nursesRes.json().catch(() => null), locale);
  const located = parseDeliveryAddresses(await addressRes.json().catch(() => null)).filter(hasLocation);
  located.sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const addresses = located.map((a) => ({ id: a.id, label: [a.label, formatAddressLine(a, locale)].filter(Boolean).join(" · ") || a.id }));
  const name = pickText(locale, service.nameAr, service.nameEn) ?? t("serviceTitle");
  return (
    <ConsultPage locale={locale} title={t("bookTitle")} backHref={back}>
      <Hero icon={serviceIcon(service.nameAr, service.nameEn)} tone={NURSING.tone} title={name} sub={service.price !== undefined ? money(locale, service.price) : t("eyebrow")} />
      <HomeCareBookingForm locale={locale} serviceId={serviceId} nurses={nurses} addresses={addresses} insurance={Boolean(service.insuranceAvailable)} />
    </ConsultPage>
  );
}
