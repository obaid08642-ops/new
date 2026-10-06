import { JsonLd } from "@/components-next/json-ld";
import { physician, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { specialtyLabel } from "@/lib/specialties";
import { formatNumber } from "@/lib/format-price";
import { ConsultPage } from "@/components-next/consult/consult-page";
import styles from "@/components-next/consult/consult.module.css";
import { ProfileHeader, type ProfileStat } from "@/components-next/consult/profile-header";
import { ActionLinks, SectionCard } from "@/components-next/consult/consult-parts";
import { readPublicEntity } from "@/lib/api/public-read";

type Props = { params: Promise<{ locale: string; slug: string; city?: string }> };

// F82-3: static/ISR. Public entity data only (no cookie, no header, no search parameter): the same HTML for everyone,
// generated on the first request for a path, kept for the hour of the read and regenerated in the background. A failed read
// throws (lib/api/public-read.ts), so Next keeps the last good copy (stale-if-error, #302); a missing entity is a 404.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchDoctor(slug: string) {
  return readPublicEntity<{ entity?: Record<string, any>; relationships?: Record<string, any> } & Record<string, any>>(
    `${API_BASE}/api/v1/entity-graph/related/doctor/${encodeURIComponent(slug)}`,
    3600,
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, city } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctor(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };

  const name = locale === "ar" ? (data.entity.name_ar || data.entity.name_en) : (data.entity.name_en || data.entity.name_ar);
  const citySuffix = city ? `/${encodeURIComponent(city)}` : "";
  const canonical = localizedUrl(locale as Locale, `/doctor/${encodeURIComponent(slug)}${citySuffix}`);
  const specialty = data.entity.specialty || "Doctor";
  const cityName = city ? decodeURIComponent(city) : "";
  const desc = cityName
    ? `${name} - ${specialty} in ${cityName}. Book appointment online or clinic consultation via Nabd Plus.`
    : `${name} - ${specialty} in Nabd Plus Saudi Healthcare. Book appointment online or clinic consultation.`;

  return {
    title: city ? `${name} | ${specialty} | ${decodeURIComponent(city)}` : `${name} | ${specialty}`,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/doctor/${encodeURIComponent(slug)}${citySuffix}`)])),
        "x-default": localizedUrl("ar", `/doctor/${encodeURIComponent(slug)}${citySuffix}`),
      },
    },
    openGraph: { title: name, description: desc, url: canonical, type: "profile" },
    robots: { index: true, follow: true },
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
  const insurers: string[] = Array.isArray(relationships.accepted_insurance) ? relationships.accepted_insurance : [];

  return (
    <ConsultPage locale={locale} title={doctorName} backHref={`/${locale}/consultations/doctors`}>
      <JsonLd
        data={[
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
            { name: doctor.specialty || "Doctors", locale: locale as Locale, path: "/consultations/doctors" }, // i18n-ok: structured-data fallback label
            { name: doctorName, locale: locale as Locale, path: doctorPath },
          ]),
        ]}
      />
      <ProfileHeader line={[specialtyLabel(names, doctor.specialty), facilityName].filter(Boolean).join(" · ") || undefined} stats={stats} />
      {insurers.length > 0 ? (
        <SectionCard id="doctor-insurance" title={c("acceptedInsurance")}>
          <div className={styles.chips}>{insurers.map((ins) => <span key={ins} className={styles.tag}>{ins}</span>)}</div>
        </SectionCard>
      ) : null}
      <ActionLinks actions={[{ href: `/${locale}/consultations/doctors/${doctor.id || slug}`, label: c("actionBookConsultation") }]} />
    </ConsultPage>
  );
}
