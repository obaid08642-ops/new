import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBooking, extractDiagnosticTracking, parseDiagnosticBookingId, parseDiagnosticDomain } from "@/lib/api/diagnostics";
import { getDiagnosticBooking, getDiagnosticTracking } from "@/lib/api/diagnostics-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { CalendarDays, ChevronLeft, ShieldCheck } from "lucide-react";
import { VectorLabs, VectorRadiology } from "@/components-next/vector-illustrations";
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
  if (!response.ok) return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}><section className={styles.state} role="alert" style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16, padding: 24 } as any}><span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}><VectorLabs size={48} aria-hidden="true" /></span><h1 style={{ color: "#1E332E", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", overflowWrap: "anywhere" }}>{t("unavailableTitle")}</h1><p style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", overflowWrap: "anywhere" }}>{t("unavailable")}</p><RetryButton /></section></main>;
  const booking = extractDiagnosticBooking(await response.json().catch(() => null));
  if (!booking) return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}><section className={styles.state} role="alert" style={{ borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", gap: 16, padding: 24 } as any}><span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}><VectorLabs size={48} aria-hidden="true" /></span><h1 style={{ color: "#1E332E", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", overflowWrap: "anywhere" }}>{t("unavailableTitle")}</h1><p style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", overflowWrap: "anywhere" }}>{t("unavailable")}</p><RetryButton /></section></main>;
  const trackingResponse = await getDiagnosticTracking(token, domain, bookingId);
  const tracking = trackingResponse.ok ? extractDiagnosticTracking(await trackingResponse.json().catch(() => null)) : null;
  const label = domain === "labs" ? t("labs.label") : locale === "ar" ? booking.scanNameAr || t("radiology.label") : booking.scanNameEn || booking.scanNameAr || t("radiology.label");
  const status = booking.state || t("statusUnavailable");
  return <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
    <Link className={styles.back} href={`/${locale}/diagnostics`} style={{ color: "#1E332E", gap: 8, borderRadius: 20, border: "1px solid #E8EDEE", padding: "8px 12px", background: "rgba(255,255,255,.82)", overflowWrap: "anywhere" } as any}><ChevronLeft size={17} aria-hidden="true" /><span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{t("back")}</span></Link>
    <section className={styles.hero} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><div className={styles.heroText} style={{ gap: 8 } as any}><p className={styles.eyebrow} style={{ color: "#1E332E", gap: 8, overflowWrap: "anywhere" } as any}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1 style={{ color: "#1E332E", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", overflowWrap: "anywhere" }}>{label}</h1><span className={styles.status} style={{ overflowWrap: "anywhere" } as any}>{status}</span></div><span className={styles.heroIcon} style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}>{domain === "labs" ? <VectorLabs size={48} aria-hidden="true" /> : <VectorRadiology size={48} aria-hidden="true" />}</span></section>
    <section className={styles.detail} aria-label={label} style={{ gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}><dl className={styles.grid} style={{ gap: 16 } as any}>
      <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>
      {booking.scheduledAt ? <div className={styles.item}><dt><CalendarDays size={15} aria-hidden="true" />{t("scheduled")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}</dd></div> : null}
      {booking.locationType ? <div className={styles.item}><dt>{t("location")}</dt><dd>{booking.locationType}</dd></div> : null}
      {booking.medicalReferralRequired !== undefined ? <div className={styles.item}><dt>{t("referral")}</dt><dd>{booking.medicalReferralRequired ? t("yes") : t("no")}</dd></div> : null}
    </dl><p className={styles.notice}>{t("detailNotice")}</p></section>
    {domain === "labs" && tracking ? <section className={styles.detail} aria-labelledby="tracking-title"><h2 id="tracking-title">{locale === "ar" ? "تتبع العينة" : "Sample tracking"}</h2>{tracking.techName && tracking.techName !== "Unknown" ? <p className={styles.notice}>{locale === "ar" ? `الفني: ${tracking.techName}` : `Technician: ${tracking.techName}`}</p> : null}{tracking.eta ? <p className={styles.notice}>{locale === "ar" ? `الوقت التقريبي: ${tracking.eta} دقيقة` : `Approximate time: ${tracking.eta} minutes`}</p> : null}{tracking.steps.length ? <ol style={{ display: "grid", gap: 10, margin: 0, paddingInlineStart: "1.4rem" }}>{tracking.steps.map((step, index) => <li key={`${step.title}-${index}`}><strong>{step.title}</strong>{step.time ? <small> · {step.time}</small> : null}</li>)}</ol> : <p className={styles.notice}>{locale === "ar" ? "لا توجد تحديثات تتبع بعد." : "No tracking updates yet."}</p>}</section> : null}
  </main>;
}
