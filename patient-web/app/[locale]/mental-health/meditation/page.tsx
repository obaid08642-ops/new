import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Brain, CalendarDays, ChevronLeft, Clock3, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseMeditationHistory } from "@/lib/api/meditation";
import { getPatientMeditationHistory } from "@/lib/api/meditation-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorMentalHealth } from "@/components-next/vector-illustrations";
import styles from "../mental-health.module.css";
type Props = { params: Promise<{ locale: string }> };
export default async function MeditationHistoryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MentalHealth");
  const token = await requirePatientAccess(locale);
  const response = await getPatientMeditationHistory(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <VectorMentalHealth size={42} aria-hidden="true" />
          <h1>{t("meditationHistoryUnavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  const entries = parseMeditationHistory(await response.json().catch(() => null));
  return (
    <main className={`main ${styles.page}`}>
      <Link className={styles.back} href={`/${locale}/mental-health`}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("meditationBack")}
      </Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("meditationEyebrow")}
          </p>
          <h1>{t("meditationHistoryTitle")}</h1>
          <p>{t("meditationHistoryNotice")}</p>
        </div>
        <span className={styles.heroVector}>
          <VectorMentalHealth size={48} aria-hidden="true" />
        </span>
      </section>
      {entries.length ? (
        <section className={styles.grid} aria-label={t("meditationHistoryTitle")}>
          {entries.map((entry) => (
            <article className={styles.card} key={entry.id}>
              <Brain size={24} aria-hidden="true" />
              <strong>{entry.type || t("meditationUnavailable")}</strong>
              {entry.durationMinutes !== undefined ? (
                <span>
                  <Clock3 size={13} aria-hidden="true" style={{ display: "inline", verticalAlign: "middle" }} /> {entry.durationMinutes} {t("minutes")}
                </span>
              ) : null}
              {entry.completed !== undefined ? (
                <span>{entry.completed ? t("completed") : t("notCompleted")}</span>
              ) : null}
              {entry.loggedAt ? (
                <span>
                  <CalendarDays size={13} aria-hidden="true" style={{ display: "inline", verticalAlign: "middle" }} /> {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(entry.loggedAt))}
                </span>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.state}>
          <VectorMentalHealth size={42} aria-hidden="true" />
          <p>{t("meditationHistoryEmpty")}</p>
        </section>
      )}
    </main>
  );
}
