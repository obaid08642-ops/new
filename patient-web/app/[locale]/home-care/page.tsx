import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractHomeCareBookings } from "@/lib/api/home-care";
import { getPatientHomeCareBookings } from "@/lib/api/home-care-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { CalendarDays, Clock3, HousePlus, ShieldCheck } from "lucide-react";
import { VectorNursing } from "@/components-next/vector-illustrations";
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
  if (!response.ok)
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
        <section
          className={styles.state}
          role="alert"
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16 } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorNursing size={48} aria-hidden="true" />
          </span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("unavailableTitle")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  const bookings = extractHomeCareBookings(await response.json().catch(() => null));
  const serviceName = (booking: (typeof bookings)[number]) =>
    locale === "ar" ? booking.serviceNameAr || booking.serviceNameEn || t("serviceUnavailable") : booking.serviceNameEn || booking.serviceNameAr || t("serviceUnavailable");
  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <section
        className={styles.intro}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: 24,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <div className={styles.introText} style={{ display: "grid", gap: 8, minWidth: 0 } as any}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}>
            <ShieldCheck size={15} aria-hidden="true" />
            <span style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
              {t("eyebrow")}
            </span>
          </p>
          <h1
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            } as any}
          >
            {t("title")}
          </h1>
        </div>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "rgba(95,217,179,.12)",
            border: "1px solid #E8EDEE",
            flex: "0 0 auto",
          } as any}
        >
          <VectorNursing size={48} aria-hidden="true" />
        </span>
      </section>
      <Link
        href={`/${locale}/home-care/services`}
        className={styles.notice}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          borderRadius: 20,
          border: "1px solid #E8EDEE",
          background: "#5FD9B3",
          color: "#1E332E",
          fontWeight: 700,
          textDecoration: "none",
          width: "fit-content",
          overflowWrap: "anywhere",
        } as any}
      >
        {t("browseServices")}
      </Link>
      {bookings.length === 0 ? (
        <section
          className={styles.state}
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16, display: "grid", placeItems: "center" } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorNursing size={48} aria-hidden="true" />
          </span>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("empty")}</p>
        </section>
      ) : (
        <section className={styles.grid} aria-label={t("title")} style={{ gap: 16 } as any}>
          {bookings.map((booking) => (
            <article
              className={styles.card}
              key={booking.id}
              style={{
                border: "1px solid #E8EDEE",
                borderRadius: 20,
                background: "rgba(255,255,255,.82)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                padding: 16,
                gap: 16,
              } as any}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: "rgba(95,217,179,.12)",
                  border: "1px solid #E8EDEE",
                  flex: "0 0 auto",
                } as any}
              >
                <VectorNursing size={48} aria-hidden="true" />
              </span>
              <div className={styles.cardBody} style={{ display: "grid", gap: 8, minWidth: 0 } as any}>
                <strong
                  className={styles.service}
                  style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}
                >
                  {serviceName(booking)}
                </strong>
                <span className={styles.status} style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>
                  {booking.state || t("statusUnavailable")}
                </span>
                {booking.scheduledAt ? (
                  <span className={styles.detail} style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7C6E", overflowWrap: "anywhere" } as any}>
                    <CalendarDays size={14} aria-hidden="true" />
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(booking.scheduledAt))}
                  </span>
                ) : null}
                {booking.sessionsCount ? (
                  <span className={styles.detail} style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>
                    {t("sessions", { count: booking.sessionsCount })}
                  </span>
                ) : null}
                {booking.duration ? (
                  <span className={styles.detail} style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7C6E", overflowWrap: "anywhere" } as any}>
                    <Clock3 size={14} aria-hidden="true" />
                    {booking.duration}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}
      <p
        className={styles.notice}
        style={{ color: "#6B7C6E", overflowWrap: "anywhere", border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", padding: "12px 16px" } as any}
      >
        {t("notice")}
      </p>
    </main>
  );
}
