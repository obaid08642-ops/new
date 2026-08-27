import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getPatientHealthScore } from "@/lib/api/vitals-server";
import { parseHealthScore } from "@/lib/api/health-score";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import styles from "../health.module.css";

type Props = { params: Promise<{ locale: string }> };
export default async function HealthScorePage({ params }: Props) {
  const { locale } = await params; if (!isLocale(locale)) notFound(); setRequestLocale(locale);
  const t = await getTranslations("Health"); const token = await requirePatientAccess(locale); const response = await getPatientHealthScore(token);
  if (response.status === 401) redirect(`/${locale}/login`); if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;
  const score = parseHealthScore(await response.json().catch(() => null));
  if (!score) return <main className="main"><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;
  return <main className="main"><Link className={styles.back} href={`/${locale}/health`}><ArrowLeft size={16} aria-hidden="true" />{t("back")}</Link><section className={styles.hero}><div><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("scoreTitle")}</h1><p>{t("scoreNotice")}</p></div><strong className={styles.score}>{score.score == null ? t("scoreInsufficient") : score.score}</strong></section><section className={styles.cards} aria-label={t("scoreComponents")}><div className={styles.card}><span>{t("scoreStatus")}</span><strong>{score.status}</strong></div>{score.components.map((item) => <div className={styles.card} key={item.key}><span>{item.key}</span><strong>{item.score}</strong></div>)}</section></main>;
}
