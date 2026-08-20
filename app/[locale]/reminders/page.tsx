import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BellRing, Clock3, Pill } from "lucide-react";
import { extractMedicationReminderSummaries } from "@/lib/api/reminders";
import { getPatientMedicationReminders } from "@/lib/api/reminders-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import styles from "./reminders.module.css";

type Props = { params: Promise<{ locale: string }> };

export default async function RemindersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Reminders");
  const token = await requirePatientAccess(locale);
  const response = await getPatientMedicationReminders(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><BellRing size={25} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></main>;
  const reminders = extractMedicationReminderSummaries(await response.json().catch(() => null));
  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><BellRing size={27} aria-hidden="true" /></span></section>{reminders.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><BellRing size={25} aria-hidden="true" /></span><h2>{t("title")}</h2><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{reminders.map((reminder) => <article className={styles.card} key={reminder.id}><span className={styles.medicineIcon}><Pill size={20} aria-hidden="true" /></span><div className={styles.cardBody}><strong className={styles.medicine}>{reminder.medicineName || t("medicineUnavailable")}</strong>{reminder.dose ? <span className={styles.dose}>{reminder.dose}</span> : null}{reminder.times.length ? <span className={styles.times}>{reminder.times.map((time) => <span className={styles.time} key={time}><Clock3 size={12} aria-hidden="true" />{time}</span>)}</span> : null}{reminder.frequency ? <span className={styles.frequency}>{reminder.frequency}</span> : null}</div></article>)}</section>}<p className={styles.notice}>{t("notice")}</p></main>;
}
