import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components-next/json-ld";
import { HomeShell } from "@/components-next/home/home-shell";
import { AiCard, CuratedSections, DoctorsSection, HeroCard, ServiceGrid } from "@/components-next/home/home-parts";
import styles from "@/components-next/home/home.module.css";
import { authCookieNames } from "@/lib/auth/cookies";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { getPublicDoctors } from "@/lib/api/doctors-server";
import { extractDoctors } from "@/lib/api/doctors";
import { isOutage } from "@/lib/api/outage";
import { readHomeContent, readPublicConfig, isWebMaintenance, selectHomeSections } from "@/lib/api/public-config-server";
import { RetryErrorState } from "@/components-next/core/core-states";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Metadata" });
  const canonical = localizedUrl(locale);
  const title = t("portalTitle");
  const description = t("publicDescription");
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ...Object.fromEntries(locales.map((supportedLocale) => [supportedLocale, localizedUrl(supportedLocale)])),
        "x-default": localizedUrl("ar"),
      },
    },
    openGraph: { type: "website", url: canonical, title, description, siteName: t("siteTitle") },
    twitter: { card: "summary", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "HomeWeb" });
  const home = await getTranslations({ locale, namespace: "Home" });
  const metadata = await getTranslations({ locale, namespace: "Metadata" });
  const url = localizedUrl(locale);
  const signedIn = Boolean((await cookies()).get(authCookieNames.access)?.value);
  const specialties = await getTranslations({ locale, namespace: "SpecialtyNames" });

  // Doctors and the public config are the page's data. A FAILURE of either (no answer, or a 5xx) shows the error state with a
  // retry inside the shell; an empty answer or a missing optional part (the curated sections) still just hides.
  const [doctorsResponse, config, content] = await Promise.all([
    getPublicDoctors().catch(() => null),
    readPublicConfig(),
    readHomeContent(),
  ]);
  if (isOutage(doctorsResponse) || config.failed) {
    return (
      <HomeShell locale={locale} signedIn={signedIn} surface="home">
        <div className={styles.page}>
          <RetryErrorState title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={t("retry")} />
        </div>
      </HomeShell>
    );
  }
  const doctors = extractDoctors(await doctorsResponse?.json().catch(() => null)).slice(0, 4);

  // R6-5: web honours the admin maintenance flag; home renders curated sections.
  const maintenance = isWebMaintenance(config.data, locale);
  if (maintenance.maintenance) {
    return (
      <HomeShell locale={locale} signedIn={signedIn} surface="home">
        <div className={styles.page}>
          <section className={styles.hero}>
            <h1 className={styles.title}>{t("maintenanceTitle")}</h1>
            <p className={styles.eyebrow}>{maintenance.message || t("maintenanceBody")}</p>
          </section>
        </div>
      </HomeShell>
    );
  }
  const homeSections = selectHomeSections(content.data);

  return (
    <HomeShell locale={locale} signedIn={signedIn} surface="home">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: metadata("siteTitle"),
            url: siteOrigin(),
            inLanguage: locale,
            potentialAction: {
              "@type": "SearchAction",
              target: `${siteOrigin()}/${locale}/search?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalOrganization",
            name: metadata("siteTitle"),
            url: siteOrigin(),
          },
          {
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            name: metadata("portalTitle"),
            url,
            inLanguage: locale,
            isPartOf: { "@type": "WebSite", url: siteOrigin() },
          },
        ]}
      />
      <div className={styles.page}>
        <div className={styles.heroGrid} data-aside="false">
          <HeroCard locale={locale} t={t} eyebrow={home("heroBadge")} title={home("heroTitle")} headingId="home-title" />
        </div>
        <ServiceGrid locale={locale} t={t} />
        <AiCard locale={locale} t={t} />
        <CuratedSections sections={homeSections} locale={locale} t={t} />
        <DoctorsSection doctors={doctors} locale={locale} t={t} specialties={specialties} />
      </div>
    </HomeShell>
  );
}
