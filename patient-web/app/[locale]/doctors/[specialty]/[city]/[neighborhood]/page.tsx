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

type Props = { params: Promise<{ locale: string; specialty: string; city: string; neighborhood: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchDoctorsByNeighborhood(specialty: string, city: string, neighborhood: string) {
  const district = readSegment(neighborhood);
  // The explore endpoint filters the facilities by district on the server; no whole-city fallback.
  const json = await readPublicEntity<ExploreResult>(
    `${API_BASE}/api/v1/entity-graph/explore?specialty=${encodeURIComponent(specialty)}&city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`,
    3600,
  );
  if (!json) return null;
  return { ...json, facilities: json.facilities ?? [], neighborhood: district };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, specialty, city, neighborhood } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchDoctorsByNeighborhood(specialty, city, neighborhood);

  if (!data || (data.total_doctors === 0 && data.facilities?.length === 0)) {
    return { robots: { index: false, follow: false } };
  }

  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const vars = { specialty: readSegment(specialty), city: readSegment(city), neighborhood: readSegment(neighborhood) };

  const canonical = localizedUrl(
    locale as Locale,
    `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}/${encodeURIComponent(neighborhood)}`,
  );
  const title = t("meta.doctorsNeighborhood.title", vars);
  const desc = t("meta.doctorsNeighborhood.description", vars);

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(
              l,
              `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}/${encodeURIComponent(neighborhood)}`,
            ),
          ]),
        ),
        "x-default": localizedUrl(
          "ar",
          `/doctors/${encodeURIComponent(specialty)}/${encodeURIComponent(city)}/${encodeURIComponent(neighborhood)}`,
        ),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function DoctorsSpecialtyCityNeighborhoodPage({ params }: Props) {
  const { locale, specialty, city, neighborhood } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchDoctorsByNeighborhood(specialty, city, neighborhood);
  if (!data || (data.total_doctors === 0 && data.facilities?.length === 0)) {
    notFound();
  }

  const t = await getTranslations("PublicLanding");
  const doctors = data.doctors ?? [];
  const facilities = data.facilities ?? [];
  const decSpec = readSegment(specialty);
  const decCity = readSegment(city);
  const decNeigh = readSegment(neighborhood);
  const vars = { specialty: decSpec, city: decCity, neighborhood: decNeigh };
  const pageTitle = t("doctorsNeighborhood.title", vars);

  return (
    <LandingPage locale={locale} title={pageTitle} intro={t("doctorsNeighborhood.intro", vars)} backHref={`/${locale}/doctors/${specialty}/${city}`}>
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/doctors/${specialty}/${city}/${neighborhood}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" }, // i18n-ok: structured data is kept exactly as published (SEO)
            { name: decSpec, locale: locale as Locale, path: `/consultations/specialties` },
            { name: decCity, locale: locale as Locale, path: `/doctors/${specialty}/${city}` },
            { name: decNeigh, locale: locale as Locale, path: `/doctors/${specialty}/${city}/${neighborhood}` },
          ]),
        ]}
      />

      {doctors.length > 0 ? (
        <LandingSection id="doctors" title={t("doctorsNeighborhood.doctors")}>
          <CardGrid label={t("doctorsNeighborhood.doctors")}>
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

      {facilities.length > 0 ? (
        <LandingSection id="facilities" title={t("doctorsNeighborhood.facilities")}>
          <CardGrid label={t("doctorsNeighborhood.facilities")}>
            {facilities.map((fac) => (
              <li key={fac.id}>
                <EntityRow
                  locale={locale}
                  href={`/${locale}/facility/${fac.slug || fac.id}`}
                  icon="hospital"
                  tone={CONSULT.tone}
                  title={pickText(locale, fac.name_ar ?? undefined, fac.name_en ?? undefined) ?? ""}
                  sub={[fac.district, fac.city].filter(Boolean).join(", ") || undefined}
                />
              </li>
            ))}
          </CardGrid>
        </LandingSection>
      ) : null}
    </LandingPage>
  );
}
