import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { readPublicEntity } from "@/lib/api/public-read";
import { patientApiUrl } from "@/lib/api/upstream";
import { readSegment } from "@/lib/api/entity-explore";
import { CONSULT } from "@/components-next/consult/consult-parts";
import { CardGrid, LandingPage, LandingSection, ServiceCard } from "@/components-next/landing/landing-kit";

type Props = { params: Promise<{ locale: string; serviceSlug: string; citySlug: string }> };

// GET /public/ai-catalog/services (ai-commerce.service getServiceFeed): public, approved doctors and facilities.
type CatalogService = { kind?: "doctor" | "facility"; id?: string; slug?: string; name?: string; specialty?: string; facilityType?: string; acceptedInsurance?: string[] };

async function fetchServiceData(serviceSlug: string, citySlug: string) {
  const json = await readPublicEntity<{ items?: CatalogService[]; city?: string }>(
    patientApiUrl(`/public/ai-catalog/services?city=${encodeURIComponent(readSegment(citySlug))}`),
    3600,
  );
  if (!json) return null;
  // Only entries that have their own public page (doctor or facility) are listed.
  const items = (json.items ?? []).filter((item) => (item.kind === "doctor" || item.kind === "facility") && Boolean(item.slug));
  const matched = items.filter((item) =>
    item.specialty?.toLowerCase() === serviceSlug.toLowerCase() ||
    item.facilityType?.toLowerCase() === serviceSlug.toLowerCase() ||
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
  const shared = await getTranslations({ locale, namespace: "Shared" });
  const services = data.services;
  const decService = readSegment(serviceSlug);
  const decCity = readSegment(citySlug);
  const vars = { service: decService, city: decCity };
  const pageTitle = t("services.title", vars);

  return (
    <LandingPage
      locale={locale}
      title={pageTitle}
      intro={t("services.intro", vars)}
      backHref={`/${locale}`}
      crumbsLabel={shared("breadcrumbLabel")}
      crumbs={[
        { label: shared("navHome"), href: `/${locale}` },
        { label: t("ld.crumbServices"), href: `/${locale}/services` },
        { label: decService, href: `/${locale}/services/${serviceSlug}` },
        { label: decCity },
      ]}
    >
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
            { name: t("ld.crumbServices"), locale: locale as Locale, path: "/services" },
            { name: decService, locale: locale as Locale, path: `/services/${serviceSlug}` },
            { name: decCity, locale: locale as Locale, path: `/services/${serviceSlug}/${citySlug}` },
          ]),
        ]}
      />

      <LandingSection id="services" title={t("services.list")}>
        <CardGrid label={t("services.list")}>
          {services.map((svc, idx) => (
            <li key={svc.id || idx}>
              <ServiceCard
                icon={CONSULT.icon}
                tone={CONSULT.tone}
                title={svc.name ?? ""}
                chips={svc.acceptedInsurance?.length ? [t("services.insurance", { list: svc.acceptedInsurance.join(", ") })] : []}
                actionHref={`/${locale}/${svc.kind}/${encodeURIComponent(svc.slug ?? "")}`}
                actionLabel={t("services.book")}
              />
            </li>
          ))}
        </CardGrid>
      </LandingSection>
    </LandingPage>
  );
}
