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
import { getHomeContent, getPublicConfig, isWebMaintenance, selectHomeSections } from "@/lib/api/public-config-server";

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
  const isAr = locale === "ar";

  let doctors: ReturnType<typeof extractDoctors> = [];
  try {
    const res = await getPublicDoctors();
    if (res && res.ok) {
      doctors = extractDoctors(await res.json().catch(() => null)).slice(0, 4);
    }
  } catch {}

  // R6-5: web honours the admin maintenance flag; home renders curated sections.
  const maintenance = isWebMaintenance(await getPublicConfig());
  if (maintenance.maintenance) {
    return (
      <HomeShell locale={locale} signedIn={signedIn} surface="home">
        <div className={styles.page}>
          <section className={styles.hero}>
            <h1 className={styles.title}>{isAr ? "صيانة مجدولة" : "Scheduled maintenance"}</h1>
            <p className={styles.eyebrow}>{maintenance.message || (isAr ? "نعمل على تحسين الخدمة. حاول لاحقاً." : "We are improving the service. Please try again later.")}</p>
          </section>
        </div>
      </HomeShell>
    );
  }
  const homeSections = selectHomeSections(await getHomeContent());

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
        <DoctorsSection doctors={doctors} locale={locale} t={t} />
      </div>
    </HomeShell>
  );
}
