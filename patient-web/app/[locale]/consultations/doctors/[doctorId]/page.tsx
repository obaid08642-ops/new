import { JsonLd } from "@/components-next/json-ld";
import { physician, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { specialtyLabel } from "@/lib/specialties";
import { doctorDisplayName, extractDoctor, extractDoctorSlots, type DoctorSlots } from "@/lib/api/doctors";
import { getPublicDoctor, getPublicDoctorSlots } from "@/lib/api/doctors-server";
import { AppointmentBookingForm } from "@/components-next/appointment-booking-form";
import { formatPrice, formatNumber } from "@/lib/format-price";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { LinkSegmented } from "@/components-next/consult/link-segmented";
import { ProfileHeader, type ProfileStat } from "@/components-next/consult/profile-header";
import { Notice, SectionCard } from "@/components-next/consult/consult-parts";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; doctorId: string }>; searchParams: Promise<{ date?: string; service_type?: string }> };
const serviceTypes = ["video", "clinic", "home"] as const;
function today() { return new Date().toISOString().slice(0, 10); }
export async function generateMetadata({ params }: { params: Promise<{ doctorId: string; locale: string }> }): Promise<Metadata> {
  const { locale, doctorId } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Doctors" });
  const canonical = localizedUrl(locale, `/consultations/doctors/${encodeURIComponent(doctorId)}`);
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, canonical.replace(`/${locale}`, "") )])), "x-default": localizedUrl("ar", canonical.replace(`/${locale}`, "")) },
    },
    openGraph: { type: "website", url: canonical },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorDetailPage({ params, searchParams }: Props) {
  const { locale, doctorId } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const query = await searchParams; const date = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(query.date ?? "") ? query.date! : today(); const serviceType = serviceTypes.includes(query.service_type as typeof serviceTypes[number]) ? query.service_type as typeof serviceTypes[number] : "video";
  const t = await getTranslations("Doctors");
  const c = await getTranslations("ConsultWeb");
  const names = await getTranslations("SpecialtyNames");

  let doctor = null;
  try {
    const response = await getPublicDoctor(doctorId);
    if (response && response.ok) {
      doctor = extractDoctor(await response.json().catch(() => null));
    }
  } catch {}

  if (!doctor) {
    notFound();
  }

  let slots: DoctorSlots | null = null;
  try {
    const slotsResponse = await getPublicDoctorSlots({ id: doctor.id, date, serviceType });
    if (slotsResponse?.ok) {
      slots = extractDoctorSlots(await slotsResponse.json().catch(() => null));
    }
  } catch {}

  // No fabricated fallback: an empty/failed slot response renders the honest
  // closed/empty states below (P0-04). Never mask backend availability.

  const name = doctorDisplayName(doctor, locale) ?? t("nameUnavailable");
  const stats: ProfileStat[] = [];
  if (doctor.rating !== undefined) stats.push({ value: formatNumber(locale, doctor.rating), label: c("statRating") });
  if (doctor.experienceYears !== undefined) stats.push({ value: formatNumber(locale, doctor.experienceYears), label: c("statYears") });
  if (doctor.price !== undefined) stats.push({ value: formatPrice(locale, doctor.price).text, label: c("statPrice") });
  const tags = [doctor.verified ? t("verifiedDoctor") : undefined, doctor.licenseNo ? t("licenseNumber", { number: doctor.licenseNo }) : undefined, doctor.facility, doctor.acceptsInsurance ? c("acceptsInsurance") : undefined].filter((tag): tag is string => Boolean(tag));
  const base = `/${locale}/consultations/doctors/${doctor.id}`;

  return (
    <ConsultPage locale={locale} title={name} backHref={`/${locale}/consultations/doctors`}>
      <JsonLd data={[physician({ name, path: `/consultations/doctors/${doctor.id}`, locale, specialty: doctor.specialty ?? null }), breadcrumbList([{ name: t("title"), locale, path: "/consultations/doctors" }, { name, locale, path: `/consultations/doctors/${doctor.id}` }])]} />
      <ProfileHeader line={[doctor.degree, specialtyLabel(names, doctor.specialty)].filter(Boolean).join(" · ") || undefined} tags={tags} stats={stats} />
      <SectionCard id="slots-title" title={t("slotsTitle")}>
        <LinkSegmented
          label={t("serviceTypeLabel")}
          value={serviceType}
          options={serviceTypes.map((type) => ({ value: type, label: t(`service_${type}`), href: `${base}?date=${date}&service_type=${type}` }))}
        />
        <p className={`${styles.body} ${styles.muted}`}>{t("slotsForDate", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)) })}</p>
        {slots?.slots.length ? (
          <AppointmentBookingForm locale={locale} doctorId={doctor.id} serviceType={serviceType} slots={slots.slots} />
        ) : (
          <Notice>{t(slots?.reason === "closed" ? "slotsClosed" : "slotsEmpty")}</Notice>
        )}
      </SectionCard>
      <Notice>{t("detailNotice")}</Notice>
    </ConsultPage>
  );
}
