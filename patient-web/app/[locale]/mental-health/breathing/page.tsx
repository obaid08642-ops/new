import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity, CalendarDays, ChevronLeft, Clock3, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { parseBreathingHistory } from "@/lib/api/breathing";
import { getPatientBreathingHistory } from "@/lib/api/breathing-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorMentalHealth } from "@/components-next/vector-illustrations";
import styles from "../mental-health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function BreathingHistoryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("MentalHealth");
  const token = await requirePatientAccess(locale);
  const response = await getPatientBreathingHistory(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <VectorMentalHealth size={42} aria-hidden="true" />
          <h1>{t("breathingUnavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );

  const sessions = parseBreathingHistory(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`}>
      <Link className={styles.back} href={`/${locale}/mental-health`}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("breathingBack")}
      </Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("breathingEyebrow")}
          </p>
          <h1>{t("breathingTitle")}</h1>
          <p>{t("breathingNotice")}</p>
        </div>
        <span className={styles.heroVector}>
          <VectorMentalHealth size={48} aria-hidden="true" />
        </span>
      </section>

      {sessions.length ? (
        <section className={styles.grid} aria-label={t("breathingTitle")}>
          {sessions.map((session) => (
            <article className={styles.card} key={session.id}>
              <Activity size={24} aria-hidden="true" />
              <strong>{session.technique || t("techniqueUnavailable")}</strong>
              {session.rounds !== undefined ? <span>{t("rounds")}: {session.rounds}</span> : null}
              {session.durationSeconds !== undefined ? (
                <span>
                  <Clock3 size={13} aria-hidden="true" style={{ display: "inline", verticalAlign: "middle" }} /> {t("durationSeconds")}: {session.durationSeconds}
                </span>
              ) : null}
              {session.loggedAt ? (
                <span>
                  <CalendarDays size={13} aria-hidden="true" style={{ display: "inline", verticalAlign: "middle" }} /> {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(session.loggedAt))}
                </span>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.state}>
          <VectorMentalHealth size={42} aria-hidden="true" />
          <p>{t("breathingEmpty")}</p>
        </section>
      )}
    </main>
  );
}
