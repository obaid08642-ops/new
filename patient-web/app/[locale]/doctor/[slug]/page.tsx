import { JsonLd } from "@/components-next/json-ld";
import { physician, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { specialtyLabel } from "@/lib/specialties";
import { getPublicDoctorEntity } from "@/lib/api/doctors-server";
import { formatNumber } from "@/lib/format-price";
import { ConsultPage } from "@/components-next/consult/consult-page";
import styles from "@/components-next/consult/consult.module.css";
import { ProfileHeader, type ProfileStat } from "@/components-next/consult/profile-header";
import { ActionLinks, SectionCard } from "@/components-next/consult/consult-parts";

type Props = { params: Promise<{ locale: string; slug: string; city?: string }> };

async function fetchDoctor(slug: string) {
  const res = await getPublicDoctorEntity(slug);
  if (!res?.ok) return null;
  return await res.json().catch(() => null);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug, city } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctor(slug);
  if (!data?.entity) return { robots: { index: false, follow: false } };

  const name = locale === "ar" ? (data.entity.name_ar || data.entity.name_en) : (data.entity.name_en || data.entity.name_ar);
  const citySuffix = city ? `/${encodeURIComponent(city)}` : "";
  const canonical = localizedUrl(locale as Locale, `/doctor/${encodeURIComponent(slug)}${citySuffix}`);
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
            { name: doctor.specialty || (await getTranslations("PublicLanding"))("ld.crumbDoctors"), locale: locale as Locale, path: "/consultations/doctors" },
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
