import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractVitalSummary } from "@/lib/api/vitals";
import { getPatientVitalSummary } from "@/lib/api/vitals-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { Activity, CalendarDays, HeartPulse } from "lucide-react";
import { VitalGlyph, type VitalGlyphKind } from "@/components-next/vital-glyph";
import styles from "./health.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Health");
  const unavailable = <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const token = await requirePatientAccess(locale);
  let response: Response;
  try {
    response = await getPatientVitalSummary(token);
  } catch {
    return unavailable;
  }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return unavailable;
  const vitals = extractVitalSummary(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><HeartPulse size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Activity size={27} aria-hidden="true" /></span></section>{vitals.length === 0 ? <section className={styles.state}><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{vitals.map((vital) => <article className={styles.card} key={vital.key}><div className={styles.cardTop}><span>{t(`vitals.${vital.key}`)}</span><span className={styles.glyph}><VitalGlyph kind={vital.key as VitalGlyphKind} /></span></div><p className={styles.value}>{vital.value}{vital.unit ? ` ${vital.unit}` : ""}</p>{vital.measuredAt ? <p className={styles.date}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(vital.measuredAt))}</p> : null}</article>)}</section>}<p className={styles.notice}>{t("notice")}</p></main>;
}
