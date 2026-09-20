import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity, CalendarDays, ChevronLeft, Moon, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientSleepReadings } from "@/lib/api/sleep-server";
import { parseSleepReadings } from "@/lib/api/sleep";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import styles from "../health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function SleepPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Sleep");
  const token = await requirePatientAccess(locale);
  let response: Response;
  try {
    response = await getPatientSleepReadings(token);
  } catch {
    return (
      <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
        <section
          className={styles.state}
          role="alert"
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16 } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorHealthShield size={48} aria-hidden="true" />
          </span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("unavailableTitle")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  }
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
            <VectorHealthShield size={48} aria-hidden="true" />
          </span>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
            {t("unavailableTitle")}
          </h1>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );

  const readings = parseSleepReadings(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`} style={{ background: "#FDFDFC", gap: 16 } as any}>
      <Link
        className={styles.back}
        href={`/${locale}/health`}
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
        <ChevronLeft size={16} aria-hidden="true" />
        {t("back")}
      </Link>
      <section
        className={styles.hero}
        style={{
          gap: 16,
          padding: 24,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p className={styles.eyebrow} style={{ color: "#1E332E", display: "flex", alignItems: "center", gap: 8, overflowWrap: "anywhere" } as any}>
            <Moon size={15} aria-hidden="true" />
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
          <VectorHealthShield size={48} aria-hidden="true" />
        </span>
      </section>
      {readings.length ? (
        <section className={styles.grid} aria-label={t("title")} style={{ gap: 16 } as any}>
          {readings.map((reading, index) => (
            <article
              className={styles.card}
              key={reading.id || `${reading.measuredAt || "reading"}-${index}`}
              style={{
                border: "1px solid #E8EDEE",
                borderRadius: 20,
                background: "rgba(255,255,255,.82)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                padding: 16,
                gap: 8,
              } as any}
            >
              <div className={styles.cardTop} style={{ gap: 8 } as any}>
                <span style={{ color: "#1E332E", fontWeight: 700, overflowWrap: "anywhere" } as any}>{t("reading")}</span>
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    background: "rgba(95,217,179,.12)",
                    border: "1px solid #E8EDEE",
                  } as any}
                >
                  <Moon size={18} aria-hidden="true" />
                </span>
              </div>
              <p className={styles.value} style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden", color: "#1E332E" } as any}>
                {reading.score !== undefined ? `${reading.score} ${t("score")}` : t("notAvailable")}
              </p>
              {reading.durationHours !== undefined ? (
                <p className={styles.date} style={{ overflowWrap: "anywhere", color: "#6B7C6E" } as any}>
                  {t("duration")}: {reading.durationHours} {t("hours")}
                </p>
              ) : null}
              {reading.measuredAt ? (
                <p className={styles.date} style={{ overflowWrap: "anywhere", color: "#6B7C6E", display: "flex", alignItems: "center", gap: 8 } as any}>
                  <CalendarDays size={14} aria-hidden="true" />
                  <span style={{ overflowWrap: "anywhere" } as any}>
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(reading.measuredAt))}
                  </span>
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section
          className={styles.state}
          style={{ border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: 24, gap: 16, display: "grid", placeItems: "center" } as any}
        >
          <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE" } as any}>
            <VectorHealthShield size={48} aria-hidden="true" />
          </span>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{t("empty")}</p>
        </section>
      )}
      <p
        className={styles.notice}
        style={{ color: "#6B7C6E", overflowWrap: "anywhere", border: "1px solid #E8EDEE", borderRadius: 20, background: "rgba(255,255,255,.82)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 } as any}
      >
        <ShieldCheck size={15} aria-hidden="true" /> {t("notice")}
      </p>
    </main>
  );
}
