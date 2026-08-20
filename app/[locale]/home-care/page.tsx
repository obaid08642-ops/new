import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareBookings } from "@/lib/api/home-care";
import { getPatientHomeCareBookings } from "@/lib/api/home-care-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";

type Props = { params: Promise<{ locale: string }> };

export default async function HomeCarePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HomeCare");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHomeCareBookings(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const bookings = extractHomeCareBookings(await response.json().catch(() => null));
  const serviceName = (booking: typeof bookings[number]) => locale === "ar" ? booking.serviceNameAr || booking.serviceNameEn || t("serviceUnavailable") : booking.serviceNameEn || booking.serviceNameAr || t("serviceUnavailable");
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1>{bookings.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="homecare-grid" aria-label={t("title")}>{bookings.map((booking) => <article className="homecare-card" key={booking.id}><strong>{serviceName(booking)}</strong><span>{booking.state || t("statusUnavailable")}</span>{booking.scheduledAt ? <span>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}</span> : null}{booking.sessionsCount ? <span>{t("sessions", { count: booking.sessionsCount })}</span> : null}{booking.duration ? <span>{booking.duration}</span> : null}</article>)}</section>}<p className="privacy-notice">{t("notice")}</p></main>;
}
