import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractDiagnosticBooking, parseDiagnosticBookingId, parseDiagnosticDomain } from "@/lib/api/diagnostics";
import { getDiagnosticBooking } from "@/lib/api/diagnostics-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

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
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const booking = extractDiagnosticBooking(await response.json().catch(() => null));
  if (!booking) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const label = domain === "labs" ? t("labs.label") : locale === "ar" ? booking.scanNameAr || t("radiology.label") : booking.scanNameEn || booking.scanNameAr || t("radiology.label");
  return <main className="main dashboard"><Link className="back-link" href={`/${locale}/diagnostics`}>{t("back")}</Link><div className="eyebrow">{t("eyebrow")}</div><h1>{label}</h1><section className="status-card"><dl className="order-detail"><div><dt>{t("status")}</dt><dd>{booking.state || t("statusUnavailable")}</dd></div>{booking.scheduledAt ? <div><dt>{t("scheduled")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}</dd></div> : null}{booking.locationType ? <div><dt>{t("location")}</dt><dd>{booking.locationType}</dd></div> : null}{booking.medicalReferralRequired !== undefined ? <div><dt>{t("referral")}</dt><dd>{booking.medicalReferralRequired ? t("yes") : t("no")}</dd></div> : null}</dl><p>{t("detailNotice")}</p></section></main>;
}
