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
  const services = [
    {
      image: "/images/categories/medications.jpg",
      color: "#00876F",
      badge: isAr ? "توصيل 30 دقيقة" : "30-min Delivery",
      title: t("pharmacyTitle"),
      desc: isAr ? "صيدلية شاملة وتوصيل فوري لجميع الأدوية والمستلزمات الطبية." : t("pharmacyDesc"),
      href: `/${locale}/c`,
    },
    {
      image: "/images/doctors/dr-sarah.jpg",
      color: "#1D4ED8",
      badge: isAr ? "أطباء معتمدون" : "Verified Doctors",
      title: t("doctorsTitle"),
      desc: isAr ? "استشارات فورية ومواعيد عيادات مع نخبة الأطباء والاستشاريين." : t("doctorsDesc"),
      href: `/${locale}/consultations/doctors`,
    },
    {
      image: "/images/labs/comprehensive-checkup.jpg",
      color: "#B45309",
      badge: isAr ? "سحب منزلي" : "Home Sample",
      title: t("labsTitle"),
      desc: isAr ? "باقات فحص مخبري شاملة ودقيقة مع خدمة سحب الدم منزلياً." : t("labsDesc"),
      href: `/${locale}/diagnostics/packages`,
    },
    {
      image: "/images/radiology/mri.jpg",
      color: "#6D28D9",
      badge: isAr ? "مراكز معتمدة" : "Accredited Centers",
      title: t("radiologyTitle"),
      desc: isAr ? "حجز رنين مغناطيسي MRI وأشعة مقطعية CT وسونار في أرقى المراكز." : t("radiologyDesc"),
      href: `/${locale}/diagnostics/radiology`,
    },
    {
      image: "/images/nursing/home-nurse.jpg",
      color: "#BE123C",
      badge: isAr ? "زيارة منزلية" : "Home Visit",
      title: t("nursingTitle"),
      desc: isAr ? "رعاية تمريضية منزلية، متابعة كبار السن، ومحاليل وريدية." : t("nursingDesc"),
      href: `/${locale}/nursing/catalog`,
    },
    {
      image: "/images/categories/babycare.jpg",
      color: "#0F766E",
      badge: isAr ? "رعاية خاصة" : "Specialized Care",
      title: isAr ? "صحة الأم والطفل" : "Maternity & Baby",
      desc: isAr ? "متابعة مراحل الحمل أسبوعاً بأسبوع واستشارات طب الأطفال التخصصية." : "Pregnancy tracking and pediatric specialized care.",
      href: `/${locale}/maternity`,
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

      {/* Hero Banner with Soft 3D Aesthetics & Real Photography */}
      <section className={`${styles.hero} ${styles.fadeInUp}`}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <Sparkles size={16} aria-hidden="true" />
            <span>{isAr ? "رعايتك الصحية المتكاملة في المملكة" : "Your Integrated Healthcare in Saudi Arabia"}</span>
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
          </div>
        </div>
        <div className={styles.heroPhotoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero/hero-pharmacy.jpg" alt="Nabd Healthcare" />
        </div>
      </section>

      {/* Core Health Services Grid */}
      <section className={`${styles.servicesSection} ${styles.fadeInUp}`}>
        <div className={styles.sectionHead}>
          <h2>{t("servicesTitle")}</h2>
          <p>{t("servicesSubtitle")}</p>
        </div>

        <div className={styles.servicesGrid}>
          {services.map((s, idx) => (
            <Link
              key={idx}
              href={s.href}
              className={styles.serviceCard}
            >
              <div className={styles.serviceImgWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt={s.title} />
              </div>
              <div className={styles.serviceBody}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <h3 style={{ margin: 0 }}>{s.title}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(184,224,48,0.2)", color: "#16213A" }}>
                    {s.badge}
                  </span>
                </div>
                <p>{s.desc}</p>
              </div>
              <span className={styles.cardArrow} style={{ color: s.color }}>
                <ArrowUpLeft size={18} />
              </span>
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
