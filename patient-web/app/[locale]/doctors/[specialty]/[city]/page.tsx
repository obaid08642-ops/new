import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { readPublicEntity } from "@/lib/api/public-read";
import { readSegment, type ExploreResult } from "@/lib/api/entity-explore";
import { CONSULT } from "@/components-next/consult/consult-parts";
import { DoctorListCard } from "@/components-next/consult/doctor-list-card";
import { CardGrid, EntityRow, LandingPage, LandingSection } from "@/components-next/landing/landing-kit";
import { pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string; specialty: string; city: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchDoctorsByLocation(specialty: string, city: string) {
  return readPublicEntity<ExploreResult>(
    `${API_BASE}/api/v1/entity-graph/explore?specialty=${encodeURIComponent(specialty)}&city=${encodeURIComponent(city)}`,
    3600,
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, specialty, city } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctorsByLocation(specialty, city);

  // If no providers or facilities exist, do not index thin page
  if (!data || (data.total_doctors === 0 && data.total_facilities === 0)) {
    return { robots: { index: false, follow: false } };
  }

  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const vars = { specialty: readSegment(specialty), city: readSegment(city) };
  const canonical = localizedUrl(locale as Locale, `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}`);
  const title = t("meta.doctorsCity.title", vars);
  const desc = t("meta.doctorsCity.description", vars);

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}`)])),
        "x-default": localizedUrl("ar", `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorsSpecialtyCityPage({ params }: Props) {
  const { locale, specialty, city } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchDoctorsByLocation(specialty, city);
  // Anti-thin doorway page rule: must have at least one doctor or facility
  if (!data || (data.total_doctors === 0 && data.total_facilities === 0)) {
    notFound();
  }

  const t = await getTranslations("PublicLanding");
  const doctors = data.doctors ?? [];
  const facilities = data.facilities ?? [];
  const vars = { specialty: readSegment(specialty), city: readSegment(city) };
  const pageTitle = t("doctorsCity.title", vars);

  return (
    <LandingPage locale={locale} title={pageTitle} intro={t("doctorsCity.intro", vars)} backHref={`/${locale}/consultations/specialties`}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/doctors/${specialty}/${city}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" }, // i18n-ok: structured data is kept exactly as published (SEO)
            { name: specialty, locale: locale as Locale, path: `/consultations/specialties` },
            { name: city, locale: locale as Locale, path: `/doctors/${specialty}/${city}` },
          ]),
        ]}
      />

      {doctors.length ? (
        <LandingSection id="doctors" title={t("doctorsCity.doctors")}>
          <CardGrid label={t("doctorsCity.doctors")}>
            {doctors.map((doc) => (
              <li key={doc.id}>
                <DoctorListCard
                  locale={locale}
                  href={`/${locale}/doctor/${doc.slug || doc.id}`}
                  name={pickText(locale, doc.name_ar ?? undefined, doc.name_en ?? undefined) ?? ""}
                  specialty={doc.specialty ?? undefined}
                  place={doc.city ?? undefined}
                  modes={[]}
                  bookLabel={t("doctorsCity.book")}
                />
              </li>
            ))}
          </CardGrid>
        </LandingSection>
      ) : null}

      {facilities.length ? (
        <LandingSection id="facilities" title={t("doctorsCity.facilities")}>
          <CardGrid label={t("doctorsCity.facilities")}>
            {facilities.map((fac) => (
              <li key={fac.id}>
                <EntityRow
                  locale={locale}
                  href={`/${locale}/facility/${fac.slug || fac.id}`}
                  icon="hospital"
                  tone={CONSULT.tone}
                  title={pickText(locale, fac.name_ar ?? undefined, fac.name_en ?? undefined) ?? ""}
                  sub={[fac.city, fac.district].filter(Boolean).join(" - ") || undefined}
                />
              </li>
            ))}
          </CardGrid>
        </LandingSection>
      ) : null}
    </LandingPage>
  );
}
