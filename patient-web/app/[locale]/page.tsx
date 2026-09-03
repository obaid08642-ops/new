import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components-next/json-ld";
import {
  Activity,
  ArrowUpLeft,
  Calendar,
  Compass,
  HeartPulse,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TestTube2,
} from "lucide-react";
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

  const t = await getTranslations("Home");
  const metadata = await getTranslations("Metadata");
  const url = localizedUrl(locale);

  const services = [
    {
      icon: Pill,
      color: "#16a34a",
      bg: "rgba(22, 163, 74, 0.1)",
      title: t("pharmacyTitle"),
      desc: t("pharmacyDesc"),
      href: `/${locale}/c`,
    },
    {
      icon: Stethoscope,
      color: "#2563eb",
      bg: "rgba(37, 99, 235, 0.1)",
      title: t("doctorsTitle"),
      desc: t("doctorsDesc"),
      href: `/${locale}/consultations/doctors`,
    },
    {
      icon: TestTube2,
      color: "#7c3aed",
      bg: "rgba(124, 58, 237, 0.1)",
      title: t("labsTitle"),
      desc: t("labsDesc"),
      href: `/${locale}/diagnostics/labs`,
    },
    {
      icon: HeartPulse,
      color: "#0891b2",
      bg: "rgba(8, 145, 178, 0.1)",
      title: t("nursingTitle"),
      desc: t("nursingDesc"),
      href: `/${locale}/nursing/catalog`,
    },
    {
      icon: Activity,
      color: "#4f46e5",
      bg: "rgba(79, 70, 229, 0.1)",
      title: t("radiologyTitle"),
      desc: t("radiologyDesc"),
      href: `/${locale}/diagnostics/radiology`,
    },
    {
      icon: Sparkles,
      color: "#0d9488",
      bg: "rgba(13, 148, 136, 0.1)",
      title: t("aiTitle"),
      desc: t("aiDesc"),
      href: `/${locale}/ai`,
    },
    {
      icon: Compass,
      color: "#0284c7",
      bg: "rgba(2, 132, 199, 0.1)",
      title: t("mapTitle"),
      desc: t("mapDesc"),
      href: `/${locale}/map`,
    },
    {
      icon: ShieldAlert,
      color: "#dc2626",
      bg: "rgba(220, 38, 38, 0.1)",
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

      {/* Hero Banner */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Sparkles size={16} aria-hidden="true" />
            <span>{t("heroBadge")}</span>
          </div>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroDesc")}</p>
        </div>
      </section>

      {/* Quick Services Grid */}
      <section className={styles.servicesSection}>
        <div className={styles.sectionHead}>
          <h2>{t("servicesTitle")}</h2>
          <p>{t("servicesSubtitle")}</p>
        </div>

        <div className={styles.servicesGrid}>
          {services.map((s, idx) => {
            const Icon = s.icon;
            return (
              <Link
                key={idx}
                href={s.href}
                className={`${styles.serviceCard} ${s.danger ? styles.dangerCard : ""}`}
              >
                <div
                  className={styles.serviceIconWrap}
                  style={{ backgroundColor: s.bg, color: s.color }}
                >
                  <Icon size={28} />
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

      {/* Trust & Safety Banner */}
      <section className={styles.trustBanner}>
        <div className={styles.trustItem}>
          <ShieldCheck size={24} color="#00876f" />
          <div>
            <strong>{t("trustLicensed")}</strong>
            <span>{t("trustLicensedSub")}</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <Pill size={24} color="#00876f" />
          <div>
            <strong>{t("trustGenuine")}</strong>
            <span>{t("trustGenuineSub")}</span>
          </div>
        </div>
        <div className={styles.trustItem}>
          <Calendar size={24} color="#00876f" />
          <div>
            <strong>{t("trustCare")}</strong>
            <span>{t("trustCareSub")}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
