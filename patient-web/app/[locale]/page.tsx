import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components-next/json-ld";
import {
  ArrowUpLeft,
  Calendar,
  Pill,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import {
  VectorPharmacy,
  VectorDoctor,
  VectorLabs,
  VectorNursing,
  VectorRadiology,
  VectorAI,
  VectorMap,
  VectorEmergency,
} from "@/components-next/vector-illustrations";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import styles from "./home.module.css";

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

  const t = await getTranslations({ locale, namespace: "Home" });
  const metadata = await getTranslations({ locale, namespace: "Metadata" });
  const url = localizedUrl(locale);

  const services = [
    {
      Illustration: VectorPharmacy,
      color: "#00876F",
      bg: "rgba(95, 217, 179, 0.14)",
      title: t("pharmacyTitle"),
      desc: t("pharmacyDesc"),
      href: `/${locale}/c`,
    },
    {
      Illustration: VectorDoctor,
      color: "#1D4ED8",
      bg: "rgba(79, 168, 224, 0.14)",
      title: t("doctorsTitle"),
      desc: t("doctorsDesc"),
      href: `/${locale}/consultations/doctors`,
    },
    {
      Illustration: VectorLabs,
      color: "#B45309",
      bg: "rgba(255, 201, 60, 0.16)",
      title: t("labsTitle"),
      desc: t("labsDesc"),
      href: `/${locale}/diagnostics/labs`,
    },
    {
      Illustration: VectorNursing,
      color: "#BE123C",
      bg: "rgba(255, 77, 90, 0.12)",
      title: t("nursingTitle"),
      desc: t("nursingDesc"),
      href: `/${locale}/nursing/catalog`,
    },
    {
      Illustration: VectorRadiology,
      color: "#6D28D9",
      bg: "rgba(139, 92, 246, 0.12)",
      title: t("radiologyTitle"),
      desc: t("radiologyDesc"),
      href: `/${locale}/diagnostics/radiology`,
    },
    {
      Illustration: VectorAI,
      color: "#0F766E",
      bg: "rgba(184, 224, 48, 0.18)",
      title: t("aiTitle"),
      desc: t("aiDesc"),
      href: `/${locale}/ai`,
    },
    {
      Illustration: VectorMap,
      color: "#0369A1",
      bg: "rgba(79, 168, 224, 0.14)",
      title: t("mapTitle"),
      desc: t("mapDesc"),
      href: `/${locale}/map`,
    },
    {
      Illustration: VectorEmergency,
      color: "#DC2626",
      bg: "rgba(220, 38, 38, 0.12)",
      title: t("emergencyTitle"),
      desc: t("emergencyDesc"),
      href: `/${locale}/emergency`,
      danger: true,
    },
  ];

  return (
    <main className={`main ${styles.homePage}`}>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: metadata("siteTitle"),
            url: siteOrigin(),
            inLanguage: locale,
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

      {/* Hero Banner with Soft 3D Artwork */}
      <section className={`${styles.hero} ${styles.fadeInUp}`}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Sparkles size={16} aria-hidden="true" />
            <span>{t("heroBadge")}</span>
          </div>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroDesc")}</p>
          <div className={styles.heroActionGroup}>
            <Link href={`/${locale}/c`} className={styles.heroPrimaryBtn}>
              <span>تسوق الصيدلية</span>
              <ChevronLeft size={18} aria-hidden="true" />
            </Link>
            <Link href={`/${locale}/consultations/doctors`} className={styles.heroSecondaryBtn}>
              <span>احجز استشارة طبيب</span>
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <VectorAI size={120} />
        </div>
      </section>

      {/* Quick Services Grid with 3D Vector Icons */}
      <section className={`${styles.servicesSection} ${styles.fadeInUp}`}>
        <div className={styles.sectionHead}>
          <h2>{t("servicesTitle")}</h2>
          <p>{t("servicesSubtitle")}</p>
        </div>

        <div className={styles.servicesGrid}>
          {services.map((s, idx) => {
            const Illustration = s.Illustration;
            return (
              <Link
                key={idx}
                href={s.href}
                className={`${styles.serviceCard} ${s.danger ? styles.dangerCard : ""}`}
              >
                <div
                  className={styles.serviceIconWrap}
                  style={{ backgroundColor: s.bg }}
                >
                  <Illustration size={36} />
                </div>
                <div className={styles.serviceBody}>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
                <span className={styles.cardArrow} style={{ color: s.color }}>
                  <ArrowUpLeft size={18} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trust & Safety Banner with Premium Badges */}
      <section className={`${styles.trustBanner} ${styles.fadeInUp}`}>
        <div className={styles.trustItem}>
          <ShieldCheck size={26} color="#00876F" />
          <div>
            <strong>{t("trustLicensed")}</strong>
            <span>{t("trustLicensedSub")}</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <Pill size={26} color="#00876F" />
          <div>
            <strong>{t("trustGenuine")}</strong>
            <span>{t("trustGenuineSub")}</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <Calendar size={26} color="#00876F" />
          <div>
            <strong>{t("trustCare")}</strong>
            <span>{t("trustCareSub")}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
