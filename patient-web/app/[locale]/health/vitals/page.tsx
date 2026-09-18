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
import baseStyles from "../health.module.css";
import styles from "./vitals.module.css";
const s = { ...baseStyles, ...styles } as typeof baseStyles & typeof styles;

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
      <main className={`main ${s.page}`}>
        <section className={s.state} role="alert">
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );

  const readings = extractVitalHistory(await response.json().catch(() => null));

  return (
    <main className={`main ${s.page}`}>
      <Link href={`/${locale}/health`} className={s.back}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("backToHealth")}
      </Link>
      <section className={s.hero}>
        <div>
          <p className={s.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("vitalsHistoryEyebrow")}
          </p>
          <h1>{t("vitalsHistoryTitle")}</h1>
          <p>{t("vitalsHistoryNotice")}</p>
          <p>
              <Link href={`/${locale}/health/vitals/log`} className={s.cta}>
                {locale === "ar" ? "تسجيل قراءة" : "Log reading"}
              </Link>
          </p>
        </div>
        <span className={s.heroVector}>
          <VectorVitals size={48} aria-hidden="true" />
        </span>
      </section>
      {readings.length ? (
        <section className={s.grid} aria-label={t("vitalsHistoryTitle")}>
          {readings.map((reading) => (
            <article className={s.card} key={reading.id}>
              <div className={s.cardTop}>
                <span>{t(`vitals.${reading.key}`)}</span>
                <span className={s.glyph}>
                  <Activity size={18} aria-hidden="true" />
                </span>
              </div>
              <p className={s.value}>
                {reading.value}
                {reading.unit ? ` ${reading.unit}` : ""}
              </p>
              {reading.context ? <p className={s.context}>{reading.context}</p> : null}
              {reading.measuredAt ? (
                <p className={s.date}>
                  <CalendarDays size={14} aria-hidden="true" />
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(reading.measuredAt))}
                </p>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <section className={s.state}>
          <VectorVitals size={48} aria-hidden="true" />
          <p>{t("vitalsHistoryEmpty")}</p>
          <p>{t("vitalsHistoryNoDefaults")}</p>
        </section>
      )}
      <p className={s.notice}>{t("vitalsHistoryReadOnly")}</p>
    </main>
  );
}
