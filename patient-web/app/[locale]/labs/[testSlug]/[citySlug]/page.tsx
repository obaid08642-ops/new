import { JsonLd } from "@/components-next/json-ld";
import { medicalWebPage, breadcrumbList, labTest } from "@/lib/seo/structured-data";
import type { Metadata } from "next";
import { localizedUrl } from "@/lib/seo";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { readPublicEntity } from "@/lib/api/public-read";
import { readSegment, type ExploreResult } from "@/lib/api/entity-explore";
import { CardGrid, LandingEmpty, LandingPage, LandingSection, ServiceCard } from "@/components-next/landing/landing-kit";
import { LAB, pickText } from "@/components-next/diagnostics/diag-parts";

type Props = { params: Promise<{ locale: string; testSlug: string; citySlug: string }> };

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.nabd.plus";

async function fetchLabTestData(testSlug: string, citySlug: string) {
  const json = await readPublicEntity<ExploreResult>(
    `${API_BASE}/api/v1/entity-graph/explore?city=${encodeURIComponent(citySlug)}`,
    3600,
  );
  if (!json) return null;
  return {
    facilities: json.facilities ?? [],
    city: readSegment(citySlug),
    test: readSegment(testSlug),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, testSlug, citySlug } = await params;
  if (!isLocale(locale)) return {};
  const data = await fetchLabTestData(testSlug, citySlug);
  const hasFacilities = Boolean(data && data.facilities.length > 0);
  const t = await getTranslations({ locale, namespace: "PublicLanding" });
  const vars = { test: readSegment(testSlug), city: readSegment(citySlug) };

  if (!hasFacilities) {
    const canonical = localizedUrl(locale as Locale, `/labs/${encodeURIComponent(testSlug)}/${encodeURIComponent(citySlug)}`);
    return {
      title: t("meta.labsEmpty.title", vars),
      description: t("meta.labsEmpty.description", vars),
      alternates: { canonical, languages: Object.fromEntries(locales.map((l) => [l, localizedUrl(l, `/labs/${encodeURIComponent(testSlug)}/${encodeURIComponent(citySlug)}`)])) },
      robots: { index: true, follow: true },
    };
  }

  const canonical = localizedUrl(
    locale as Locale,
    `/labs/${encodeURIComponent(testSlug)}/${encodeURIComponent(citySlug)}`,
  );
  const title = t("meta.labs.title", vars);
  const desc = t("meta.labs.description", vars);

  return {
    title,
    description: desc,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(
          locales.map((l) => [
            l,
            localizedUrl(l, `/labs/${encodeURIComponent(testSlug)}/${encodeURIComponent(citySlug)}`),
          ]),
        ),
        "x-default": localizedUrl("ar", `/labs/${encodeURIComponent(testSlug)}/${encodeURIComponent(citySlug)}`),
      },
    },
    openGraph: { title, description: desc, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function LabTestCityPage({ params }: Props) {
  const { locale, testSlug, citySlug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const data = await fetchLabTestData(testSlug, citySlug);
  const hasFacilities = Boolean(data && data.facilities.length > 0);
  if (!data) notFound();

  const t = await getTranslations("PublicLanding");
  const decTest = readSegment(testSlug);
  const decCity = readSegment(citySlug);
  const vars = { test: decTest, city: decCity };
  const facilities = data.facilities;
  const pageTitle = t("labs.title", vars);

  return (
    <LandingPage locale={locale} title={pageTitle} intro={t("labs.intro", vars)} backHref={`/${locale}/diagnostics/labs`}>
      {/* // i18n-ok: structured data is kept exactly as published (SEO) */}
      <JsonLd
        data={[
          medicalWebPage({
            title: pageTitle,
            path: `/labs/${testSlug}/${citySlug}`,
            locale: locale as Locale,
          }),
          breadcrumbList([
            { name: "Nabd Plus", locale: locale as Locale, path: "/" },
            { name: "Diagnostics", locale: locale as Locale, path: "/diagnostics/labs" },
            { name: decTest, locale: locale as Locale, path: `/labs/${testSlug}` },
            { name: decCity, locale: locale as Locale, path: `/labs/${testSlug}/${citySlug}` },
          ]),
          labTest({
            name: decTest,
            path: `/labs/${testSlug}/${citySlug}`,
            locale: locale as Locale,
            // i18n-ok: structured data is kept exactly as published (SEO)
            description: `Verified ${decTest} diagnostic test in ${decCity}`,
          }),
        ]}
      />

      {!hasFacilities ? (
        <LandingEmpty icon={LAB.icon} tone={LAB.tone} title={t("labs.emptyTitle", vars)} body={t("labs.emptyBody", vars)} actionLabel={t("labs.register")} actionHref={`/${locale}/consultations/doctors`} />
      ) : (
        <LandingSection id="partners" title={t("labs.partners")}>
          <CardGrid label={t("labs.partners")}>
            {facilities.map((fac) => (
              <li key={fac.id}>
                <ServiceCard
                  icon={LAB.icon}
                  tone={LAB.tone}
                  title={pickText(locale, fac.name_ar ?? undefined, fac.name_en ?? undefined) ?? ""}
                  sub={fac.city ?? undefined}
                  actionHref={`/${locale}/diagnostics/labs`}
                  actionLabel={t("labs.book")}
                />
              </li>
            ))}
          </CardGrid>
        </LandingSection>
      )}
    </LandingPage>
  );
}
