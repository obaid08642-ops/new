import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { CSSProperties } from "react";
import { Activity, Bell, CalendarDays, FileText, HeartPulse, MessageCircle, Moon, UsersRound } from "lucide-react";
import { extractVitalSummary } from "@/lib/api/vitals";
import { getPatientVitalSummary } from "@/lib/api/vitals-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { VitalGlyph, type VitalGlyphKind } from "@/components-next/vital-glyph";
import styles from "./health.module.css";

type Props = { params: Promise<{ locale: string }> };
const quickActions = [
  { key: "prescriptions", href: "prescriptions", icon: FileText, color: "#7A6BEA" },
  { key: "family", href: "family", icon: UsersRound, color: "#EC4899" },
  { key: "reminders", href: "reminders", icon: Bell, color: "#F0A526" },
  { key: "chat", href: "chat", icon: MessageCircle, color: "#23B5CE" },
  { key: "sleep", href: "health/sleep", icon: Moon, color: "#6366F1" },
] as const;
const quickLabels: Record<string, Record<string, string>> = {
  ar: { prescriptions: "وصفاتي", family: "العائلة", reminders: "تذكيراتي", chat: "محادثة", sleep: "النوم" },
  en: { prescriptions: "Prescriptions", family: "Family", reminders: "Reminders", chat: "Chat", sleep: "Sleep" },
  ur: { prescriptions: "نسخے", family: "خاندان", reminders: "یاددہانیاں", chat: "گفتگو", sleep: "نیند" },
  hi: { prescriptions: "प्रिस्क्रिप्शन", family: "परिवार", reminders: "अनुस्मारक", chat: "चैट", sleep: "नींद" },
  bn: { prescriptions: "প্রেসক্রিপশন", family: "পরিবার", reminders: "রিমাইন্ডার", chat: "চ্যাট", sleep: "ঘুম" },
  fil: { prescriptions: "Reseta", family: "Pamilya", reminders: "Paalala", chat: "Chat", sleep: "Tulog" },
};

export default async function HealthPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Health");
  const unavailable = <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const token = await requirePatientAccess(locale);
  let response: Response;
  try { response = await getPatientVitalSummary(token); } catch { return unavailable; }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return unavailable;
  const vitals = extractVitalSummary(await response.json().catch(() => null));
  const labels = quickLabels[locale] ?? quickLabels.en;
  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}><HeartPulse size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{t("title")}</h1></div><span className={styles.heroIcon}><Activity size={27} aria-hidden="true" /></span></section><nav className={styles.quickGrid} aria-label={t("title")}>{quickActions.map(({ key, href, icon: Icon, color }) => <Link className={styles.quickAction} key={key} href={`/${locale}/${href}`} style={{ "--quick-color": color } as CSSProperties}><span><Icon size={21} aria-hidden="true" /></span><strong>{labels[key]}</strong></Link>)}</nav>{vitals.length === 0 ? <section className={styles.state}><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{vitals.map((vital) => <article className={styles.card} key={vital.key}><div className={styles.cardTop}><span>{t(`vitals.${vital.key}`)}</span><span className={styles.glyph}><VitalGlyph kind={vital.key as VitalGlyphKind} /></span></div><p className={styles.value}>{vital.value}{vital.unit ? ` ${vital.unit}` : ""}</p>{vital.measuredAt ? <p className={styles.date}><CalendarDays size={14} aria-hidden="true" />{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(vital.measuredAt))}</p> : null}</article>)}</section>}<p className={styles.notice}>{t("notice")}</p></main>;
}
