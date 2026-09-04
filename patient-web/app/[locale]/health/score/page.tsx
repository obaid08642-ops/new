import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { getPatientHealthScore } from "@/lib/api/vitals-server";
import { parseHealthScore } from "@/lib/api/health-score";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { VectorHealthShield } from "@/components-next/vector-illustrations";
import styles from "../health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthScorePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Health");
  const token = await requirePatientAccess(locale);
  const response = await getPatientHealthScore(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
        </section>
      </main>
    );

  const score = parseHealthScore(await response.json().catch(() => null));
  if (!score)
    return (
      <main className={`main ${styles.page}`}>
        <section className={styles.state} role="alert">
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailable")}</p>
        </section>
      </main>
    );

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
          <h1>{t("scoreTitle")}</h1>
          <p>{t("scoreNotice")}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <strong className={styles.score}>{score.score == null ? t("scoreInsufficient") : score.score}</strong>
          <span className={styles.heroVector}>
            <VectorHealthShield size={48} aria-hidden="true" />
          </span>
        </div>
      </section>
      <section className={styles.cards} aria-label={t("scoreComponents")}>
        <div className={styles.card}>
          <div className={styles.cardTop}>
            <span>{t("scoreStatus")}</span>
            <ShieldCheck size={18} color="#00876F" />
          </div>
          <strong className={styles.value}>{score.status}</strong>
        </div>
        {score.components.map((item) => (
          <div className={styles.card} key={item.key}>
            <div className={styles.cardTop}>
              <span>{item.key}</span>
            </div>
            <strong className={styles.value}>{item.score}</strong>
          </div>
        ))}
      </section>
    </main>
  );
}
