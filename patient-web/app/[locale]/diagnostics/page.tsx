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

  // No fabricated fallback: on backend/network failure the live arrays stay
  // empty and the hub renders honest empty states (P0-19). Fake prices must
  // never be presented as a real catalog.
  const finalLabServices = labServices;
  const finalRadiologyServices = radiologyServices;
  const finalPackages = labPackages;

  return (
    <main className={`main ${styles.page}`}>
      {/* Intro Header */}
      <section className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
          <h1>{t("title")}</h1>
          <nav aria-label={locale === "ar" ? "خدمات التشخيص" : "Diagnostics"} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <Link href={`/${locale}/diagnostics/bookings`}>{locale === "ar" ? "حجوزاتي" : "My bookings"}</Link>
            <Link href={`/${locale}/diagnostics/results`}>{locale === "ar" ? "نتائجي وتقاريري" : "My results"}</Link>
            <Link href={`/${locale}/diagnostics/packages`}>{locale === "ar" ? "الباقات" : "Packages"}</Link>
            <Link href={`/${locale}/diagnostics/cart`}>{locale === "ar" ? "السلة" : "Cart"}</Link>
          </nav>
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
