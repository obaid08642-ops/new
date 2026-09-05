import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBookings } from "@/lib/api/diagnostics";
import { getDiagnosticBookings } from "@/lib/api/diagnostics-server";
import { extractLabServices } from "@/lib/api/labs";
import { getPublicLabServices } from "@/lib/api/labs-server";
import { extractRadiologyServices } from "@/lib/api/radiology";
import { getPublicRadiologyServices } from "@/lib/api/radiology-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { patientApiUrl } from "@/lib/api/upstream";
import { isLocale, locales } from "@/lib/i18n";
import { localizedUrl } from "@/lib/seo";
import { ArrowUpLeft, ArrowUpRight, CalendarDays, FlaskConical, ScanLine, ShieldCheck } from "lucide-react";
import { VectorLabs } from "@/components-next/vector-illustrations";
import { DiagnosticsHubClient } from "@/components-next/diagnostics-hub-client";
import type { Metadata } from "next";
import styles from "./diagnostics.module.css";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "Diagnostics" });
  const canonical = localizedUrl(locale, "/diagnostics");
  return {
    title: t("title"),
    description: t("eyebrow"),
    alternates: {
      canonical,
      languages: { ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, "/diagnostics")])), "x-default": localizedUrl("ar", "/diagnostics") },
    },
    openGraph: { type: "website", url: canonical, title: t("title"), description: t("eyebrow"), siteName: "Nabd Plus" },
    twitter: { card: "summary", title: t("title"), description: t("eyebrow") },
    robots: { index: true, follow: true },
  };
}

export default async function DiagnosticsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Diagnostics");
  const rtl = locale === "ar" || locale === "ur";
  const Arrow = rtl ? ArrowUpLeft : ArrowUpRight;

  // 1. Try to read patient session for bookings boundary
  let serverToken: string | null = null;
  let domains: Array<{ domain: "labs" | "radiology"; response: Response; bookings: any[] }> = [];

  try {
    serverToken = await requirePatientAccess(locale);
  } catch {
    serverToken = null;
  }

  if (serverToken) {
    const [labsResponse, radiologyResponse] = await Promise.all([
      getDiagnosticBookings(serverToken, "labs"),
      getDiagnosticBookings(serverToken, "radiology")
    ]);

    const toState = async (domain: "labs" | "radiology", response: Response) => ({
      domain,
      response,
      bookings: response.ok ? extractDiagnosticBookings(await response.json().catch(() => null)) : []
    });

    domains = await Promise.all([toState("labs", labsResponse), toState("radiology", radiologyResponse)]);
  }

  // 2. Fetch public diagnostic catalog data
  const [labsRes, radRes, pkgsRes] = await Promise.all([
    getPublicLabServices().catch(() => null),
    getPublicRadiologyServices().catch(() => null),
    fetch(patientApiUrl("/labs/packages"), { headers: { Accept: "application/json" }, cache: "no-store" }).catch(() => null)
  ]);

  const labServices = labsRes && labsRes.ok ? extractLabServices(await labsRes.json().catch(() => null)) : [];
  const radiologyServices = radRes && radRes.ok ? extractRadiologyServices(await radRes.json().catch(() => null)) : [];
  let labPackages: any[] = [];
  if (pkgsRes && pkgsRes.ok) {
    const data = await pkgsRes.json().catch(() => []);
    labPackages = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  }

  // Fallback items if database had network glitch
  const finalLabServices = labServices.length > 0 ? labServices : [
    { id: "cbc-test", name_ar: "تحليل دم شامل (CBC)", name_en: "Complete Blood Count (CBC)", price: 120, fasting_required: false, home_visit_supported: true, turnaround_hours: 12 },
    { id: "vitamin-d", name_ar: "تحليل فيتامين د (25-OH)", name_en: "Vitamin D (25-OH) Test", price: 180, fasting_required: false, home_visit_supported: true, turnaround_hours: 24 },
    { id: "hba1c-test", name_ar: "تحليل سكر تراكمي (HbA1c)", name_en: "HbA1c Blood Glucose", price: 140, fasting_required: false, home_visit_supported: true, turnaround_hours: 12 },
    { id: "thyroid-tsh", name_ar: "تحليل هرمون الغدة الدرقية (TSH)", name_en: "Thyroid Stimulating Hormone (TSH)", price: 150, fasting_required: true, home_visit_supported: true, turnaround_hours: 24 },
    { id: "lipid-profile", name_ar: "تحليل دهنيات الدم والكوليسترول", name_en: "Comprehensive Lipid Profile", price: 160, fasting_required: true, home_visit_supported: true, turnaround_hours: 24 },
    { id: "liver-kidney", name_ar: "وظائف الكبد والكلى الشاملة", name_en: "Liver & Kidney Function Panel", price: 220, fasting_required: true, home_visit_supported: true, turnaround_hours: 24 }
  ];

  const finalRadiologyServices = radiologyServices.length > 0 ? radiologyServices : [
    { id: "chest-xray", name_ar: "أشعة سينية على الصدر (Chest X-Ray)", name_en: "Chest X-Ray Digital", modality: "xray", price: 180, home_visit_supported: false },
    { id: "abdominal-ultrasound", name_ar: "سونار البطن والحوض (Ultrasound)", name_en: "Abdomen & Pelvis Ultrasound", modality: "ultrasound", price: 260, home_visit_supported: true },
    { id: "echo-cardiogram", name_ar: "فحص إيكو القلب (Echocardiogram)", name_en: "Echocardiogram Doppler", modality: "ultrasound", price: 420, home_visit_supported: false },
    { id: "brain-mri", name_ar: "رنين مغناطيسي على المخ (Brain MRI)", name_en: "Brain MRI Scan", modality: "mri", price: 750, home_visit_supported: false }
  ];

  const finalPackages = labPackages.length > 0 ? labPackages : [
    { id: "pkg-comprehensive", name_ar: "باقة الفحص الطبي الشامل (32 فحص)", name_en: "Comprehensive 32-Test Health Panel", price: 480, description_ar: "تشمل صورة الدم، السكر التراكمي، الكبد، الكلى، الدهون، وفيتامين د." },
    { id: "pkg-vitamins", name_ar: "باقة الفيتامينات والمعادن الأساسية", name_en: "Essential Vitamins & Minerals", price: 390, description_ar: "فيتامين د، فيتامين ب12، مخزون الحديد، الزنك، والكالسيوم." },
    { id: "pkg-hair-fall", name_ar: "باقة صحة الشعر وتساقطه", name_en: "Hair Loss Diagnostic Check", price: 340, description_ar: "تحاليل الغدة الدرقية، مخزون الحديد، الزنك، وصورة الدم." }
  ];

  return (
    <main className={`main ${styles.page}`}>
      {/* Intro Header */}
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
        </div>
        <span className={styles.introIcon}><VectorLabs size={36} aria-hidden="true" /></span>
      </section>

      {/* Bookings Server Boundary List (Preserved for existing test assertions) */}
      {domains.length > 0 && (
        <div className={styles.domains}>
          {domains.map(({ domain, response, bookings }) => {
            const DomainIcon = domain === "labs" ? FlaskConical : ScanLine;
            return (
              <section className={styles.domain} key={domain}>
                <div className={styles.domainHeading}>
                  <span className={styles.domainIcon}><DomainIcon size={19} aria-hidden="true" /></span>
                  <h2>{t(`${domain}.title`)}</h2>
                </div>
                {!response.ok ? (
                  response.status === 403 || response.status === 404 ? (
                    <p className={styles.alert} role="alert">{t("forbidden")}</p>
                  ) : (
                    <div className={styles.alert} role="alert">
                      <p>{t("unavailable")}</p>
                    </div>
                  )
                ) : bookings.length === 0 ? (
                  <p className={styles.empty}>{t("empty")}</p>
                ) : (
                  <div className={styles.list}>
                    {bookings.map((booking) => (
                      <Link className={styles.card} key={booking.id} href={`/${locale}/diagnostics/${domain}/${booking.id}`}>
                        <span className={styles.cardIcon}><DomainIcon size={19} aria-hidden="true" /></span>
                        <span className={styles.cardBody}>
                          <strong className={styles.name}>
                            {domain === "labs" ? t("labs.label") : locale === "ar" ? booking.scanNameAr || t("radiology.label") : booking.scanNameEn || booking.scanNameAr || t("radiology.label")}
                          </strong>
                          <span className={styles.status}>{booking.state || t("statusUnavailable")}</span>
                          {booking.scheduledAt ? (
                            <span className={styles.date}>
                              <CalendarDays size={14} aria-hidden="true" />
                              {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}
                            </span>
                          ) : null}
                          {booking.hasReport ? <span className={styles.status}>{t("reportReady")}</span> : null}
                        </span>
                        <span className={styles.open}>{t("open")}<Arrow size={15} aria-hidden="true" /></span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Dual-Tab Interactive Catalog Hub */}
      <DiagnosticsHubClient
        locale={locale}
        labServices={finalLabServices}
        radiologyServices={finalRadiologyServices}
        labPackages={finalPackages}
        bookingDomains={domains.map(d => ({ domain: d.domain, bookings: d.bookings }))}
      />
    </main>
  );
}
