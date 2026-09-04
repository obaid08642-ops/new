import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Activity, CalendarDays, ChevronLeft, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractVitalHistory } from "@/lib/api/vitals";
import { getPatientVitalHistory } from "@/lib/api/vitals-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorVitals } from "@/components-next/vector-illustrations";
import styles from "../health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function VitalsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Health");
  const token = await requirePatientAccess(locale);
  const response = await getPatientVitalHistory(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );

  const readings = extractVitalHistory(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`}>
      <Link href={`/${locale}/health`} className={styles.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("backToHealth")}
      </Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("vitalsHistoryEyebrow")}
          </p>
          <h1>{t("vitalsHistoryTitle")}</h1>
          <p>{t("vitalsHistoryNotice")}</p>
        </div>
        <span className={styles.heroVector}>
          <VectorVitals size={48} aria-hidden="true" />
        </span>
      </section>
      {readings.length ? (
        <section className={styles.grid} aria-label={t("vitalsHistoryTitle")}>
          {readings.map((reading) => (
            <article className={styles.card} key={reading.id}>
              <div className={styles.cardTop}>
                <span>{t(`vitals.${reading.key}`)}</span>
                <span className={styles.glyph}>
                  <Activity size={18} aria-hidden="true" />
                </span>
              </div>
              <p className={styles.value}>
                {reading.value}
                {reading.unit ? ` ${reading.unit}` : ""}
              </p>
              {reading.context ? <p>{reading.context}</p> : null}
              {reading.measuredAt ? (
                <p className={styles.date}>
                  <CalendarDays size={14} aria-hidden="true" />
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(reading.measuredAt))}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.state}>
          <VectorVitals size={42} aria-hidden="true" />
          <p>{t("vitalsHistoryEmpty")}</p>
          <p>{t("vitalsHistoryNoDefaults")}</p>
        </section>
      )}
      <p className={styles.notice}>{t("vitalsHistoryReadOnly")}</p>
    </main>
  );
}
