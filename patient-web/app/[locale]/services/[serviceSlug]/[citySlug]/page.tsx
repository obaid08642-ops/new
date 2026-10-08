import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { readPublicEntity } from "@/lib/api/public-read";
import { readSegment } from "@/lib/api/entity-explore";
import { CONSULT } from "@/components-next/consult/consult-parts";
import { CardGrid, LandingPage, LandingSection, ServiceCard } from "@/components-next/landing/landing-kit";

type Props = { params: Promise<{ locale: string; serviceSlug: string; citySlug: string }> };

// F82-3: static/ISR. Public catalogue data only (no cookie, no header, no search parameter): the same HTML for everyone,
// kept for the hour of the read. A failed read throws (lib/api/public-read.ts), so Next keeps the last good copy; a missing entity is a 404.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

type CatalogService = { service_id?: string; name?: string; description?: string; service_mode?: string; insurance_accepted?: string[] };

async function fetchServiceData(serviceSlug: string, citySlug: string) {
  const json = await readPublicEntity<{ items?: CatalogService[]; city?: string }>(
    `${API_BASE}/api/v1/public/ai-catalog/services?city=${encodeURIComponent(citySlug)}`,
    3600,
  );
  if (!json) return null;
  const items = json.items ?? [];
  const matched = items.filter((item) =>
    item.service_id?.toLowerCase() === serviceSlug.toLowerCase() ||
    item.name?.toLowerCase().includes(serviceSlug.toLowerCase()) ||
    serviceSlug === "all" ||
    serviceSlug === "medical"
  );
  return {
    total: matched.length > 0 ? matched.length : items.length,
    services: matched.length > 0 ? matched : items,
    city: json.city || readSegment(citySlug),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchServiceData(serviceSlug, citySlug);

  if (!data || data.services.length === 0) {
    return { robots: { index: false, follow: false } };
  }

  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const vars = { service: readSegment(serviceSlug), city: readSegment(citySlug) };

  const canonical = localizedUrl(
    locale as Locale,
    `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`,
  );
  const title = t("meta.services.title", vars);
  const desc = t("meta.services.description", vars);

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/services/${encodeURIComponent(serviceSlug)}/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function ServiceCityPage({ params }: Props) {
  const { locale, serviceSlug, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchServiceData(serviceSlug, citySlug);
  if (!data || data.services.length === 0) {
    notFound();
  }

  const t = await getTranslations("PublicLanding");
  const services = data.services;
  const decService = readSegment(serviceSlug);
  const decCity = readSegment(citySlug);
  const vars = { service: decService, city: decCity };
  const pageTitle = t("services.title", vars);

  return (
    <LandingPage locale={locale} title={pageTitle} intro={t("services.intro", vars)} backHref={`/${locale}`}>
      {/* // i18n-ok: structured data is kept exactly as published (SEO) */}
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/services/${serviceSlug}/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Services", locale: locale as Locale, path: "/services" },
            { name: decService, locale: locale as Locale, path: `/services/${serviceSlug}` },
            { name: decCity, locale: locale as Locale, path: `/services/${serviceSlug}/${citySlug}` },
          ]),
        ]}
      />

      <LandingSection id="services" title={t("services.list")}>
        <CardGrid label={t("services.list")}>
          {services.map((svc, idx) => (
            <li key={svc.service_id || idx}>
              <ServiceCard
                icon={CONSULT.icon}
                tone={CONSULT.tone}
                title={svc.name ?? ""}
                sub={svc.description || undefined}
                chips={[svc.service_mode, svc.insurance_accepted?.length ? t("services.insurance", { list: svc.insurance_accepted.join(", ") }) : undefined].filter((chip): chip is string => Boolean(chip))}
                actionHref={`/${locale}/services`}
                actionLabel={t("services.book")}
              />
            </li>
          ))}
        </CardGrid>
      </LandingSection>
    </LandingPage>
  );
}
