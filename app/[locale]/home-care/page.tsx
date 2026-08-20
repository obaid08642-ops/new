import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareBookings } from "@/lib/api/home-care";
import { getPatientHomeCareBookings } from "@/lib/api/home-care-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { CalendarDays, Clock3, HousePlus, ShieldCheck } from "lucide-react";
import styles from "./home-care.module.css";

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
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><HousePlus size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const bookings = extractHomeCareBookings(await response.json().catch(() => null));
  const serviceName = (booking: typeof bookings[number]) => locale === "ar" ? booking.serviceNameAr || booking.serviceNameEn || t("serviceUnavailable") : booking.serviceNameEn || booking.serviceNameAr || t("serviceUnavailable");
  return <main className={`main ${styles.page}`}>
    <section className={styles.intro}>
      <div className={styles.introText}>
        <p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
      </div>
      <span className={styles.introIcon}><HousePlus size={27} aria-hidden="true" /></span>
    </section>
    {bookings.length === 0 ? <section className={styles.state}><HousePlus size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{bookings.map((booking) => <article className={styles.card} key={booking.id}>
      <span className={styles.cardIcon}><HousePlus size={19} aria-hidden="true" /></span>
      <div className={styles.cardBody}>
        <strong className={styles.service}>{serviceName(booking)}</strong>
        <span className={styles.status}>{booking.state || t("statusUnavailable")}</span>
        {booking.scheduledAt ? <span className={styles.detail}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}</span> : null}
        {booking.sessionsCount ? <span className={styles.detail}>{t("sessions", { count: booking.sessionsCount })}</span> : null}
        {booking.duration ? <span className={styles.detail}><Clock3 size={14} aria-hidden="true" />{booking.duration}</span> : null}
      </div>
    </article>)}</section>}
    <p className={styles.notice}>{t("notice")}</p>
  </main>;
}
