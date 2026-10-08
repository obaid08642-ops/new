import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, radiologyService } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { patientApiUrl } from "@/lib/api/upstream";
import { readPublicEntity } from "@/lib/api/public-read";
import { readSegment } from "@/lib/api/entity-explore";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { CardGrid, LandingEmpty, LandingPage, LandingSection, ServiceCard } from "@/components-next/landing/landing-kit";
import { RADIOLOGY, money, pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string; serviceSlug: string; citySlug: string }> };

// F82-3: static/ISR. Public catalogue data only (no cookie, no header, no search parameter): the same HTML for everyone,
// kept for the hour of the read. A failed read throws (lib/api/public-read.ts), so Next keeps the last good copy.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

async function fetchRadiologyData(serviceSlug: string, citySlug: string) {
  const search = readSegment(serviceSlug).slice(0, 120).trim();
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const json = await readPublicEntity<unknown>(patientApiUrl(`/radiology/services${params.toString() ? `?${params}` : ""}`), 3600);
  if (!json) return null;
  return {
    services: extractRadiologyServices(json),
    city: readSegment(citySlug),
    service: readSegment(serviceSlug),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchRadiologyData(serviceSlug, citySlug);
  const hasServices = Boolean(data && data.services.length > 0);
  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const vars = { service: readSegment(serviceSlug), city: readSegment(citySlug) };
  if (!hasServices) {
    const canonical = localizedUrl(locale as Locale, `/radiology/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`);
    return {
      title: t("meta.radiologyEmpty.title", vars),
      description: t("meta.radiologyEmpty.description", vars),
      alternates: { canonical, languages: Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/radiology/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`)])) },
      robots: { index: true, follow: true },
    };
  }

  const canonical = localizedUrl(
    locale as Locale,
    `/radiology/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`,
  );
  const title = t("meta.radiology.title", vars);
  const desc = t("meta.radiology.description", vars);

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/radiology/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/radiology/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function RadiologyCityPage({ params }: Props) {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchRadiologyData(serviceSlug, citySlug);
  if (!data) notFound();
  const hasServices = data.services.length > 0;

  const t = await getTranslations("PublicLanding");
  const decService = readSegment(serviceSlug);
  const decCity = readSegment(citySlug);
  const vars = { service: decService, city: decCity };
  const pageTitle = t("radiology.title", vars);

  return (
    <LandingPage locale={locale} title={pageTitle} intro={t("radiology.intro", vars)} backHref={`/${locale}/diagnostics/radiology`}>
      {/* // i18n-ok: structured data is kept exactly as published (SEO) */}
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/radiology/${serviceSlug}/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Radiology", locale: locale as Locale, path: "/diagnostics/radiology" },
            { name: decService, locale: locale as Locale, path: `/radiology/${serviceSlug}` },
            { name: decCity, locale: locale as Locale, path: `/radiology/${serviceSlug}/${citySlug}` },
          ]),
          radiologyService({
            name: decService,
            path: `/radiology/${serviceSlug}/${citySlug}`,
            locale: locale as Locale,
            // i18n-ok: structured data is kept exactly as published (SEO)
            description: `Verified ${decService} diagnostic imaging procedure in ${decCity}`,
          }),
        ]}
      />

      {!hasServices ? (
        <LandingEmpty icon={RADIOLOGY.icon} tone={RADIOLOGY.tone} title={t("radiology.emptyTitle")} body={t("radiology.emptyBody", vars)} actionLabel={t("radiology.register")} actionHref={`/${locale}/consultations/doctors`} />
      ) : (
        <LandingSection id="centers" title={t("radiology.centers")}>
          <CardGrid label={t("radiology.centers")}>
            {data.services.map((service) => (
              <li key={service.id}>
                <ServiceCard
                  icon={RADIOLOGY.icon}
                  tone={RADIOLOGY.tone}
                  title={pickText(locale, service.nameAr, service.nameEn) ?? ""}
                  chips={[service.modality, service.price !== undefined ? money(locale, service.price) : undefined].filter((chip): chip is string => Boolean(chip))}
                  actionHref={`/${locale}/diagnostics/radiology`}
                  actionLabel={t("radiology.book")}
                />
              </li>
            ))}
          </CardGrid>
        </LandingSection>
      )}
    </LandingPage>
  );
}
