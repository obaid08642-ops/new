import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, nursingService } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { readPublicEntity } from "@/lib/api/public-read";
import { readSegment } from "@/lib/api/entity-explore";
import { CardGrid, LandingPage, LandingSection, ServiceCard } from "@/components-next/landing/landing-kit";
import { NURSING } from "@/components-next/nursing/nursing-parts";

type Props = { params: Promise<{ locale: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

type CatalogService = { service_id?: string; name?: string; description?: string; service_mode?: string };

async function fetchNursingData(citySlug: string) {
  const json = await readPublicEntity<{ items?: CatalogService[]; city?: string }>(
    `${API_BASE}/api/v1/public/ai-catalog/services?city=${encodeURIComponent(citySlug)}`,
    3600,
  );
  if (!json) return null;
  const items = json.items ?? [];
  const nursingItems = items.filter((item) =>
    item.service_mode?.toLowerCase().includes("home") ||
    item.name?.toLowerCase().includes("nursing") ||
    item.name?.includes("تمريض") ||
    item.name?.includes("منزل")
  );
  return {
    services: nursingItems.length > 0 ? nursingItems : items.slice(0, 5),
    city: json.city || readSegment(citySlug),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchNursingData(citySlug);

  if (!data || data.services.length === 0) {
    return { robots: { index: false, follow: false } };
  }

  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const decCity = readSegment(citySlug);

  const canonical = localizedUrl(
    locale as Locale,
    `/home-nursing/${encodeURIComponent(citySlug)}`,
  );
  const title = t("meta.homeNursing.title", { city: decCity });
  const desc = t("meta.homeNursing.description", { city: decCity });

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/home-nursing/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/home-nursing/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function HomeNursingCityPage({ params }: Props) {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchNursingData(citySlug);
  if (!data || data.services.length === 0) {
    notFound();
  }

  const t = await getTranslations("PublicLanding");
  const decCity = readSegment(citySlug);
  const services = data.services;
  const pageTitle = t("homeNursing.title", { city: decCity });

  return (
    <LandingPage locale={locale} title={pageTitle} intro={t("homeNursing.intro", { city: decCity })} backHref={`/${locale}/home-care`}>
      {/* // i18n-ok: structured data is kept exactly as published (SEO) */}
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/home-nursing/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Home Care", locale: locale as Locale, path: "/home-care/services" },
            { name: decCity, locale: locale as Locale, path: `/home-nursing/${citySlug}` },
          ]),
          nursingService({
            name: pageTitle,
            path: `/home-nursing/${citySlug}`,
            locale: locale as Locale,
            // i18n-ok: structured data is kept exactly as published (SEO)
            description: `Licensed home nursing and medical visit services in ${decCity}`,
          }),
        ]}
      />

      <LandingSection id="services" title={t("homeNursing.services")}>
        <CardGrid label={t("homeNursing.services")}>
          {services.map((svc, idx) => (
            <li key={svc.service_id || idx}>
              <ServiceCard
                icon={NURSING.icon}
                tone={NURSING.tone}
                title={svc.name ?? ""}
                sub={svc.description || undefined}
                actionHref={`/${locale}/home-care/services`}
                actionLabel={t("homeNursing.request")}
              />
            </li>
          ))}
        </CardGrid>
      </LandingSection>
    </LandingPage>
  );
}
