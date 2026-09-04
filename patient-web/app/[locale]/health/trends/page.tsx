import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity, ChevronLeft, ShieldCheck, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPatientHealthTrends } from "@/lib/api/trends-server";
import { parseHealthTrends } from "@/lib/api/trends";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VectorVitals } from "@/components-next/vector-illustrations";
import styles from "../health.module.css";

type Props = { params: Promise<{ locale: string }> };

function Direction({ dir }: { dir: "flat" | "up" | "down" }) {
  const Icon = dir === "up" ? TrendingUp : dir === "down" ? TrendingDown : Minus;
  return <Icon size={19} aria-hidden="true" />;
}

export default async function HealthTrendsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthTrends");
  const token = await requirePatientAccess(locale);
  let response: Response;
  try {
    response = await getPatientHealthTrends(token);
  } catch {
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
          <RetryButton />
        </section>
      </main>
    );
  }
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

  const trends = parseHealthTrends(await response.json().catch(() => null));

  return (
    <main className={`main ${styles.page}`}>
      <Link className={styles.back} href={`/${locale}/health`}>
        <ChevronLeft size={17} aria-hidden="true" />
        {t("back")}
      </Link>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1>{t("title")}</h1>
        </div>
        <span className={styles.heroVector}>
          <VectorVitals size={48} aria-hidden="true" />
        </span>
      </section>
      {trends.length ? (
        <section className={styles.grid} aria-label={t("title")}>
          {trends.map((trend) => (
            <article className={styles.card} key={trend.id}>
              <div className={styles.cardTop}>
                <span>{trend.name}</span>
                <span className={styles.glyph}>
                  <Direction dir={trend.trendDir} />
                </span>
              </div>
              <p className={styles.value}>
                {trend.current} {trend.unit}
              </p>
              <p className={styles.date}>
                {t(`direction.${trend.trendDir}`)} · {trend.data.length} {t("readings")}
              </p>
              <p className={styles.date}>{trend.labels.slice(-5).join(" · ")}</p>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.state}>
          <VectorVitals size={42} aria-hidden="true" />
          <p>{t("empty")}</p>
        </section>
      )}
      <p className={styles.notice}>{t("notice")}</p>
    </main>
  );
}
