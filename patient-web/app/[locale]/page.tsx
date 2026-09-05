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
  VectorMaternity,
  VectorNutrition,
  VectorMentalHealth,
  VectorChronicCare,
  VectorInsurance,
  VectorHealthShield,
} from "@/components-next/vector-illustrations";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl, siteOrigin } from "@/lib/seo";
import { getPublicDoctors } from "@/lib/api/doctors-server";
import { extractDoctors } from "@/lib/api/doctors";
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

  const isAr = locale === "ar";

  // 1. Core 4 Services - Luxury 2-Column Grid on Mobile
  const coreServices = [
    {
      id: "pharmacy",
      icon: <VectorPharmacy size={52} />,
      badge: isAr ? "توصيل 30 دقيقة" : "30-min Delivery",
      badgeBg: "rgba(0, 135, 111, 0.12)",
      badgeColor: "#00876F",
      title: isAr ? "صيدلية نبض بلس" : t("pharmacyTitle"),
      desc: isAr ? "أدوية ومستلزمات طبية أصلية وتوصيل فوري لباب منزلك" : t("pharmacyDesc"),
      href: `/${locale}/c`,
    },
    {
      id: "doctors",
      icon: <VectorDoctor size={52} />,
      badge: isAr ? "أطباء معتمدون" : "Verified Doctors",
      badgeBg: "rgba(29, 78, 216, 0.12)",
      badgeColor: "#1D4ED8",
      title: isAr ? "الاستشارات الطبية" : t("doctorsTitle"),
      desc: isAr ? "استشارات فورية ومواعيد عيادات مع نخبة الأطباء والاستشاريين" : t("doctorsDesc"),
      href: `/${locale}/consultations/doctors`,
    },
    {
      id: "diagnostics",
      icon: <VectorLabs size={52} />,
      badge: isAr ? "سحب منزلي ومراكز" : "Home Sample",
      badgeBg: "rgba(180, 83, 9, 0.12)",
      badgeColor: "#B45309",
      title: isAr ? "المختبر والأشعة" : "Diagnostics & Labs",
      desc: isAr ? "باقات فحص مخبري شاملة وحجز رنين مغناطيسي وسونار" : "Comprehensive lab packages & medical imaging",
      href: `/${locale}/diagnostics`,
    },
    {
      id: "nursing",
      icon: <VectorNursing size={52} />,
      badge: isAr ? "زيارة فورية" : "Home Visit",
      badgeBg: "rgba(190, 18, 60, 0.12)",
      badgeColor: "#BE123C",
      title: isAr ? "التمريض المنزلي" : t("nursingTitle"),
      desc: isAr ? "رعاية تمريضية متقدمة، كبار السن، غيارات ومحاليل وريدية" : t("nursingDesc"),
      href: `/${locale}/nursing/catalog`,
    },
  ];

  // 2. Specialized Healthcare Verticals Hub
  const verticals = [
    {
      id: "maternity",
      icon: <VectorMaternity size={42} />,
      badge: isAr ? "أسبوعاً بأسبوع" : "Weekly Tracker",
      badgeBg: "rgba(236, 72, 153, 0.12)",
      badgeColor: "#DB2777",
      title: isAr ? "متابعة الحمل" : "Maternity Care",
      desc: isAr ? "تتبع نمو الجنين وجدول الفحوصات ونصائح الأمومة" : "Fetal development tracking and maternal care",
      href: `/${locale}/maternity`,
    },
    {
      id: "nutrition",
      icon: <VectorNutrition size={42} />,
      badge: isAr ? "أنظمة مخصصة" : "Diet Plans",
      badgeBg: "rgba(16, 185, 129, 0.12)",
      badgeColor: "#059669",
      title: isAr ? "التغذية والحميات" : "Nutrition & Diets",
      desc: isAr ? "خطط غذائية ذكية وتتبع السعرات والسوائل يومياً" : "Personalized nutrition plans and meal tracking",
      href: `/${locale}/nutrition`,
    },
    {
      id: "mental",
      icon: <VectorMentalHealth size={42} />,
      badge: isAr ? "راحة وطمأنينة" : "Mindfulness",
      badgeBg: "rgba(99, 102, 241, 0.12)",
      badgeColor: "#4F46E5",
      title: isAr ? "الصحة النفسية" : "Mental Health",
      desc: isAr ? "جلسات استرخاء، تمارين تنفس وتتبع الحالة المزاجية" : "Breathing exercises, meditation & mood logs",
      href: `/${locale}/mental-health`,
    },
    {
      id: "chronic",
      icon: <VectorChronicCare size={42} />,
      badge: isAr ? "متابعة مستمرة" : "Chronic Care",
      badgeBg: "rgba(2, 132, 199, 0.12)",
      badgeColor: "#0284C7",
      title: isAr ? "الرعاية المزمنة" : "Chronic Care",
      desc: isAr ? "تتبع السكر والضغط وتذكير مواعيد وجرعات الأدوية" : "Vitals monitoring and medication dose reminders",
      href: `/${locale}/health/chronic-medications`,
    },
  ];

  let doctors: any[] = [];
  try {
    const res = await getPublicDoctors();
    if (res && res.ok) {
      doctors = extractDoctors(await res.json().catch(() => null)).slice(0, 4);
    }
  } catch {}

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

      {/* Hero Banner with Soft 3D Aesthetics & Modern Clarity */}
      <section className={`${styles.hero} ${styles.fadeInUp}`}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Sparkles size={16} aria-hidden="true" />
            <span>{isAr ? "رعايتك الصحية الذكية المتكاملة في المملكة" : "Your Smart Integrated Healthcare in Saudi Arabia"}</span>
          </div>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroDesc")}</p>
          <div className={styles.heroActionGroup}>
            <Link href={`/${locale}/c`} className={styles.heroPrimaryBtn}>
              <span>{isAr ? "تسوق الصيدلية" : "Shop Pharmacy"}</span>
              <ChevronLeft size={18} aria-hidden="true" />
            </Link>
            <Link href={`/${locale}/consultations/doctors`} className={styles.heroSecondaryBtn}>
              <span>{isAr ? "احجز استشارة طبيب" : "Book Doctor"}</span>
            </Link>
            <Link href={`/${locale}/insurance`} className={styles.heroSecondaryBtn}>
              <span>{isAr ? "التأمين الطبي" : "Insurance"}</span>
            </Link>
          </div>
        </div>
        <div className={styles.heroVisualWrap}>
          <VectorHealthShield size={160} className={styles.heroShieldIcon} />
        </div>
      </section>

      {/* 1. Core Health Services - Modern Luxury 2-Column Grid */}
      <section className={`${styles.servicesSection} ${styles.fadeInUp}`}>
        <div className={styles.sectionHead}>
          <h2>{isAr ? "الخدمات الطبية الأساسية" : t("servicesTitle")}</h2>
          <p>{isAr ? "وصول فوري ومباشر لكافة الرعاية الطبية بأعلى معايير الجودة" : t("servicesSubtitle")}</p>
        </div>

        <div className={styles.coreGrid}>
          {coreServices.map((s) => (
            <Link key={s.id} href={s.href} className={styles.coreCard}>
              <div className={styles.coreCardTop}>
                <div className={styles.coreIconWrap}>{s.icon}</div>
                <span
                  className={styles.coreBadge}
                  style={{ backgroundColor: s.badgeBg, color: s.badgeColor }}
                >
                  {s.badge}
                </span>
              </div>
              <div className={styles.coreCardBody}>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Specialized Healthcare Verticals Hub */}
      <section className={`${styles.verticalsSection} ${styles.fadeInUp}`}>
        <div className={styles.sectionHead}>
          <h2>{isAr ? "منظومة الرعاية المتخصصة" : "Specialized Care Hub"}</h2>
          <p>{isAr ? "حلول وخدمات ذكية تتابع صحتك وصحة أسرتك على مدار الساعة" : "Smart continuous care for you and your family"}</p>
        </div>

        <div className={styles.verticalsGrid}>
          {verticals.map((v) => (
            <Link key={v.id} href={v.href} className={styles.verticalCard}>
              <div className={styles.verticalIconWrap}>{v.icon}</div>
              <div className={styles.verticalBody}>
                <div className={styles.verticalTitleRow}>
                  <h3>{v.title}</h3>
                  <span
                    className={styles.verticalBadge}
                    style={{ backgroundColor: v.badgeBg, color: v.badgeColor }}
                  >
                    {v.badge}
                  </span>
                </div>
                <p>{v.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Doctors Section - Rendered only when real doctors are returned from database */}
      {doctors.length > 0 && (
        <section className={`${styles.featuredSection} ${styles.fadeInUp}`}>
          <div className={styles.sectionHeadingRow}>
            <div>
              <h2>{isAr ? "نخبة الأطباء والاستشاريين" : "Featured Doctors"}</h2>
              <p>{isAr ? "استشارات طبية فورية وحجز مواعيد عيادات معتمد" : "Instant consultations and verified clinic appointments"}</p>
            </div>
            <Link href={`/${locale}/consultations/doctors`} className={styles.seeAllLink}>
              <span>{isAr ? "عرض جميع الأطباء" : "View All"}</span>
              <ChevronLeft size={16} />
            </Link>
          </div>

          <div className={styles.doctorCardsGrid}>
            {doctors.map((doc) => (
              <Link key={doc.id} href={`/${locale}/consultations/doctors/${doc.id}`} className={styles.doctorCard}>
                <div className={styles.doctorCardHeader}>
                  <div className={styles.doctorAvatar}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={doc.image || `/images/doctors/${doc.id}.jpg`} alt={doc.name || ""} />
                  </div>
                  <div className={styles.doctorMeta}>
                    <strong>{doc.name}</strong>
                    <span>{doc.specialty || doc.degree}</span>
                  </div>
                </div>
                <div className={styles.doctorFooter}>
                  <span className={styles.doctorPrice}>{doc.price ? `${doc.price} ${isAr ? "ر.س" : "SAR"}` : ""}</span>
                  <span className={styles.doctorBookBtn}>
                    <span>{isAr ? "احجز الآن" : "Book Now"}</span>
                    <ChevronLeft size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
