import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, pharmacy } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { readPublicEntity } from "@/lib/api/public-read";
import { readSegment, type ExploreResult } from "@/lib/api/entity-explore";
import { CardGrid, LandingEmpty, LandingPage, LandingSection, Notice, ServiceCard } from "@/components-next/landing/landing-kit";
import { pickText } from "@/components-next/diagnostics/diag-parts";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";

type Props = { params: Promise<{ locale: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";
const PHARMACY = SERVICE_ICONS.pharmacy;

async function fetchPharmaciesData(citySlug: string) {
  const json = await readPublicEntity<ExploreResult>(
    `${API_BASE}/api/v1/entity-graph/explore?city=${encodeURIComponent(citySlug)}`,
    3600,
  );
  if (!json) return null;
  return {
    facilities: json.facilities ?? [],
    city: readSegment(citySlug),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchPharmaciesData(citySlug);
  const hasFacilities = Boolean(data && data.facilities.length > 0);
  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const decCity = readSegment(citySlug);

  if (!hasFacilities) {
    const canonical = localizedUrl(locale as Locale, `/pharmacies/${encodeURIComponent(citySlug)}`);
    return {
      title: t("meta.pharmaciesEmpty.title", { city: decCity }),
      description: t("meta.pharmaciesEmpty.description", { city: decCity }),
      alternates: { canonical, languages: Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/pharmacies/${encodeURIComponent(citySlug)}`)])) },
      robots: { index: true, follow: true },
    };
  }

  const canonical = localizedUrl(
    locale as Locale,
    `/pharmacies/${encodeURIComponent(citySlug)}`,
  );
  const title = t("meta.pharmacies.title", { city: decCity });
  const desc = t("meta.pharmacies.description", { city: decCity });

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/pharmacies/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/pharmacies/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function PharmaciesCityPage({ params }: Props) {
  const { locale, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchPharmaciesData(citySlug);
  if (!data) notFound();
  const hasFacilities = data.facilities.length > 0;

  const t = await getTranslations("PublicLanding");
  const decCity = readSegment(citySlug);
  const pageTitle = t("pharmacies.title", { city: decCity });

  return (
    <LandingPage locale={locale} title={pageTitle} intro={t("pharmacies.intro", { city: decCity })} backHref={`/${locale}/c`}>
      {/* // i18n-ok: structured data is kept exactly as published (SEO) */}
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/pharmacies/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Pharmacy", locale: locale as Locale, path: "/c" },
            { name: decCity, locale: locale as Locale, path: `/pharmacies/${citySlug}` },
          ]),
          pharmacy({
            name: pageTitle,
            path: `/pharmacies/${citySlug}`,
            locale: locale as Locale,
            city: decCity,
          }),
        ]}
      />

      <Notice>{t("pharmacies.notice")}</Notice>

      {!hasFacilities ? (
        <LandingEmpty icon={PHARMACY.icon} tone={PHARMACY.tone} title={t("pharmacies.emptyTitle", { city: decCity })} body={t("pharmacies.emptyBody", { city: decCity })} actionLabel={t("pharmacies.register")} actionHref={`/${locale}/consultations/doctors`} />
      ) : (
        <LandingSection id="pharmacies" title={t("pharmacies.list")}>
          <CardGrid label={t("pharmacies.list")}>
            {data.facilities.map((fac) => (
              <li key={fac.id}>
                <ServiceCard
                  icon={PHARMACY.icon}
                  tone={PHARMACY.tone}
                  title={pickText(locale, fac.name_ar ?? undefined, fac.name_en ?? undefined) ?? ""}
                  sub={fac.city ?? undefined}
                  actionHref={`/${locale}/c`}
                  actionLabel={t("pharmacies.order")}
                />
              </li>
            ))}
          </CardGrid>
        </LandingSection>
      )}
    </LandingPage>
  );
}
