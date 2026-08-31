import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBooking, extractDiagnosticTracking, parseDiagnosticBookingId, parseDiagnosticDomain } from "@/lib/api/diagnostics";
import { getDiagnosticBooking, getDiagnosticTracking } from "@/lib/api/diagnostics-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { CalendarDays, ChevronLeft, FlaskConical, ScanLine, ShieldCheck } from "lucide-react";
import styles from "./diagnostic-detail.module.css";

type Props = { params: Promise<{ locale: string; domain: string; bookingId: string }> };

export default async function DiagnosticDetailPage({ params }: Props) {
  const { locale, domain: rawDomain, bookingId } = await params;
  const domain = parseDiagnosticDomain(rawDomain);
  if (!isLocale(locale) || !domain || !parseDiagnosticBookingId(bookingId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Diagnostics");
  const token = await requirePatientAccess(locale);
  const response = await getDiagnosticBooking(token, domain, bookingId);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const booking = extractDiagnosticBooking(await response.json().catch(() => null));
  if (!booking) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const trackingResponse = await getDiagnosticTracking(token, domain, bookingId);
  const tracking = trackingResponse.ok ? extractDiagnosticTracking(await trackingResponse.json().catch(() => null)) : null;
  const label = domain === "labs" ? t("labs.label") : locale === "ar" ? booking.scanNameAr || t("radiology.label") : booking.scanNameEn || booking.scanNameAr || t("radiology.label");
  const DetailIcon = domain === "labs" ? FlaskConical : ScanLine;
  const status = booking.state || t("statusUnavailable");
  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/diagnostics`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <section className={styles.hero}><div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{label}</h1><span className={styles.status}>{status}</span></div><span className={styles.heroIcon}><DetailIcon size={28} aria-hidden="true" /></span></section>
    <section className={styles.detail} aria-label={label}><dl className={styles.grid}>
      <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>
      {booking.scheduledAt ? <div className={styles.item}><dt><CalendarDays size={15} aria-hidden="true" />{t("scheduled")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}</dd></div> : null}
      {booking.locationType ? <div className={styles.item}><dt>{t("location")}</dt><dd>{booking.locationType}</dd></div> : null}
      {booking.medicalReferralRequired !== undefined ? <div className={styles.item}><dt>{t("referral")}</dt><dd>{booking.medicalReferralRequired ? t("yes") : t("no")}</dd></div> : null}
    </dl><p className={styles.notice}>{t("detailNotice")}</p></section>
    {domain === "labs" && tracking ? <section className={styles.detail} aria-labelledby="tracking-title"><h2 id="tracking-title">{locale === "ar" ? "تتبع العينة" : "Sample tracking"}</h2>{tracking.techName && tracking.techName !== "Unknown" ? <p className={styles.notice}>{locale === "ar" ? `الفني: ${tracking.techName}` : `Technician: ${tracking.techName}`}</p> : null}{tracking.eta ? <p className={styles.notice}>{locale === "ar" ? `الوقت التقريبي: ${tracking.eta} دقيقة` : `Approximate time: ${tracking.eta} minutes`}</p> : null}{tracking.steps.length ? <ol style={{ display: "grid", gap: 10, margin: 0, paddingInlineStart: "1.4rem" }}>{tracking.steps.map((step, index) => <li key={`${step.title}-${index}`}><strong>{step.title}</strong>{step.time ? <small> · {step.time}</small> : null}</li>)}</ol> : <p className={styles.notice}>{locale === "ar" ? "لا توجد تحديثات تتبع بعد." : "No tracking updates yet."}</p>}</section> : null}
  </main>;
}
