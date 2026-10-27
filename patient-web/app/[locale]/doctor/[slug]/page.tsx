import { JsonLd } from "@/components-next/json-ld";
import { physician, breadcrumbList, medicalWebPage } from "@/lib/seo/structured-data";
import { DirectAnswer } from "@/components-next/seo/direct-answer";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { specialtyLabel } from "@/lib/specialties";
import { getPublicDoctorEntity } from "@/lib/api/doctors-server";
import { getPublicConfig } from "@/lib/api/public-config-server";
import { parseLateGuarantee } from "@/lib/consult/late-guarantee";
import { licenseOf } from "@/lib/api/doctors";
import { GuaranteeLine, LicenseLine } from "@/components-next/consult/differentiators";
import { formatNumber } from "@/lib/format-price";
import { ConsultPage } from "@/components-next/consult/consult-page";
import styles from "@/components-next/consult/consult.module.css";
import { ProfileHeader, type ProfileStat } from "@/components-next/consult/profile-header";
import { ActionLinks, SectionCard } from "@/components-next/consult/consult-parts";
import { DoctorSchedule, type ScheduleType } from "@/components-next/consult/doctor-schedule";
import { PublicDataUnavailableError } from "@/lib/api/public-unavailable";

type Props = { params: Promise<{ locale: string; slug: string; city?: string }> };

// F82-3: static/ISR. Public entity data only (no cookie, no header, no search parameter): the same HTML for everyone,
// generated on the first request for a path, kept for the hour of the read and regenerated in the background. A failed read
// throws (PublicDataUnavailableError), so Next keeps the last good copy (stale-if-error, #302); a missing entity is a 404.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

async function fetchDoctor(slug: string) {
  const res = await getPublicDoctorEntity(slug);
  if (!res || res.status >= 500) throw new PublicDataUnavailableError("doctor");
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, city } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctor(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };

  const name = locale === "ar" ? (data.entity.name_ar || data.entity.name_en) : (data.entity.name_en || data.entity.name_ar);
  // A /doctor/{slug}/{city} variant shows the same doctor: it points at the doctor's own page and is
  // not indexed on its own (no duplicate page per city).
  const canonical = localizedUrl(locale as Locale, `/doctor/${encodeURIComponent(slug)}`);
  // The words come from messages for the page's locale (a locale argument keeps this free of request headers: public ISR page).
  const [c, names, shared] = await Promise.all([
    getTranslations({ locale, namespace: "ConsultWeb" }),
    getTranslations({ locale, namespace: "SpecialtyNames" }),
    getTranslations({ locale, namespace: "Shared" }),
  ]);
  const specialty = specialtyLabel(names, data.entity.specialty) ?? c("doctorMetaFallback");
  const cityName = city ? decodeURIComponent(city) : "";
  const desc = cityName
    ? c("doctorMetaDescriptionCity", { name, specialty, city: cityName, brand: shared("brand") })
    : c("doctorMetaDescription", { name, specialty, brand: shared("brand") });

  return {
    title: city ? `${name} | ${specialty} | ${decodeURIComponent(city)}` : `${name} | ${specialty}`,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/doctor/${encodeURIComponent(slug)}`)])),
        "x-default": localizedUrl("ar", `/doctor/${encodeURIComponent(slug)}`),
      },
    },
    openGraph: { title: name, description: desc, url: canonical, type: "profile" },
    robots: city ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function DoctorCanonicalPage({ params }: Props) {
  const { locale, slug, city } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchDoctor(slug);
  if (!data?.entity) notFound();

  const c = await getTranslations("ConsultWeb");
  const names = await getTranslations("SpecialtyNames");
  const seo = await getTranslations("SeoAnswer");
  const doctor = data.entity;
  const relationships = data.relationships || {};
  const facility = relationships.facility;

  const doctorName = locale === "ar" ? (doctor.name_ar || doctor.name_en) : (doctor.name_en || doctor.name_ar);
  const facilityName = facility ? (locale === "ar" ? (facility.name_ar || facility.name_en) : (facility.name_en || facility.name_ar)) : null;
  const cityName = city ? decodeURIComponent(city) : null;
  const doctorPath = `/doctor/${slug}${city ? `/${encodeURIComponent(city)}` : ""}`;

  const stats: ProfileStat[] = [];
  if (doctor.rating) stats.push({ value: formatNumber(locale, Number(doctor.rating)), label: c("statRating") });
  if (doctor.experience_years) stats.push({ value: formatNumber(locale, Number(doctor.experience_years)), label: c("statYears") });
  const specialtyName = specialtyLabel(names, doctor.specialty);
  const MODE_KEYS = { clinic: "modeClinic", video: "modeVideo", home: "modeHome" } as const;
  const modes = (Array.isArray(doctor.consultation_modes) ? doctor.consultation_modes : [])
    .filter((m: string): m is keyof typeof MODE_KEYS => m in MODE_KEYS)
    .map((m: keyof typeof MODE_KEYS) => seo(MODE_KEYS[m]));
  // AEO: who the doctor is and how to book, from the profile's own fields only.
  const directAnswer = [
    specialtyName ? seo("doctorWho", { name: doctorName, specialty: specialtyName }) : null,
    facilityName ? seo("doctorFacility", { facility: facilityName }) : null,
    doctor.city ? seo("doctorCity", { city: doctor.city }) : null,
    modes.length ? seo("doctorModes", { modes: new Intl.ListFormat(locale, { type: "conjunction" }).format(modes) }) : null,
    seo("doctorBook"),
  ];
  const guarantee = parseLateGuarantee(await getPublicConfig().catch(() => null));
  const doctorsT = await getTranslations("Doctors");
  // the entity record carries the licence only when the server sends `license` / `scfhs_license_no` on it; otherwise the line stays hidden
  const license = licenseOf(doctor.license, doctor.scfhs_license_no);
  // the visit types the entity record offers (clinic first, as the booking page opens), in the order the booking page lists them
  const scheduleTypes = (["clinic", "video", "home"] as const).filter((type): type is ScheduleType => Array.isArray(doctor.consultation_modes) && doctor.consultation_modes.includes(type));
  const insurers: string[] = Array.isArray(relationships.accepted_insurance) ? relationships.accepted_insurance : [];

  return (
    <ConsultPage locale={locale} title={doctorName} backHref={`/${locale}/consultations/doctors`}>
      <JsonLd
        data={[
          medicalWebPage({ title: doctorName, locale: locale as Locale, path: `/doctor/${slug}`, speakable: true }),
          physician({
            name: doctorName,
            path: doctorPath,
            locale: locale as Locale,
            specialty: doctor.specialty || null,
            city: cityName,
            ratingValue: doctor.rating_avg ?? doctor.rating ?? null,
            reviewCount: doctor.reviews_count ?? null,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" }, // i18n-ok: brand name in structured data
            { name: doctor.specialty || (await getTranslations("PublicLanding"))("ld.crumbDoctors"), locale: locale as Locale, path: "/consultations/doctors" },
            { name: doctorName, locale: locale as Locale, path: doctorPath },
          ]),
        ]}
      />
      <DirectAnswer sentences={directAnswer} />
      <ProfileHeader line={[specialtyLabel(names, doctor.specialty), facilityName].filter(Boolean).join(" · ") || undefined} stats={stats} />
      <LicenseLine text={license ? doctorsT("licenseLine", { number: license.number }) : null} verifiedLabel={license?.verified ? doctorsT("licenseVerified") : undefined} />
      <GuaranteeLine text={guarantee ? doctorsT("guaranteeLine", { minutes: guarantee.minutes, points: guarantee.points }) : null} />
      {scheduleTypes.length > 0 && doctor.id ? (
        <SectionCard id="doctor-appointments" title={doctorsT("slotsTitle")}>
          <DoctorSchedule
            doctorId={String(doctor.id)}
            locale={locale}
            types={scheduleTypes.map((type) => ({ value: type, label: doctorsT(`service_${type}`) }))}
            initialType={scheduleTypes[0]}
            bookHref={`/${locale}/consultations/book/${encodeURIComponent(String(doctor.id))}`}
            labels={{ daysLabel: doctorsT("scheduleDaysLabel"), timesLabel: doctorsT("scheduleTimesLabel"), typesLabel: doctorsT("serviceTypeLabel"), today: doctorsT("scheduleToday"), tomorrow: doctorsT("scheduleTomorrow"), loading: doctorsT("scheduleLoading"), empty: doctorsT("scheduleEmpty"), noDays: doctorsT("scheduleNoDays"), error: doctorsT("scheduleError"), retry: doctorsT("scheduleRetry"), signIn: doctorsT("scheduleSignIn"), book: doctorsT("chooseDayTime") }}
          />
        </SectionCard>
      ) : null}
      {insurers.length > 0 ? (
        <SectionCard id="doctor-insurance" title={c("acceptedInsurance")}>
          <div className={styles.chips}>{insurers.map((ins) => <span key={ins} className={styles.tag}>{ins}</span>)}</div>
        </SectionCard>
      ) : null}
      <ActionLinks actions={[{ href: `/${locale}/consultations/doctors/${doctor.id || slug}`, label: c("actionBookConsultation") }]} />
    </ConsultPage>
  );
}
