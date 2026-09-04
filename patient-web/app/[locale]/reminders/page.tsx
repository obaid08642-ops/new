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
  let reminders: any[] = [];
  try {
    const { cookies } = await import("next/headers");
    const { authCookieNames } = await import("@/lib/auth/cookies");
    const token = (await cookies()).get(authCookieNames.access)?.value;
    if (token) {
      const response = await getPatientMedicationReminders(token);
      if (response && response.ok) {
        reminders = extractMedicationReminderSummaries(await response.json().catch(() => null));
      }
    }
  } catch {}
  const doseRows = reminders.flatMap((reminder) => (reminder.todayDoses.length ? reminder.todayDoses : reminder.times.map((timeKey) => ({ timeKey, status: "pending" as const }))).map((dose) => ({ reminder, ...dose })));
  const nextDose = doseRows.filter((dose) => dose.status === "pending").sort((a, b) => a.timeKey.localeCompare(b.timeKey))[0];
  const takenDoses = doseRows.filter((dose) => dose.status === "taken").length;
  return <main className={`main ${styles.page}`}><section className={styles.hero}><div><p className={styles.eyebrow}>{t("eyebrow")}</p><h1>{t("title")}</h1><p>{t("notice")}</p></div><span className={styles.heroIcon}><BellRing size={27} aria-hidden="true" /></span></section>{reminders.length ? <section className={styles.summary} aria-label={t("title")}><span className={styles.summaryIcon}><Clock3 size={22} aria-hidden="true" /></span><div><strong>{nextDose ? `${nextDose.timeKey} · ${nextDose.reminder.medicineName ?? t("medicineUnavailable")}` : t("empty")}</strong><span>{doseRows.length ? `${takenDoses}/${doseRows.length}` : t("notice")}</span></div></section> : null}{reminders.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><BellRing size={25} aria-hidden="true" /></span><h2>{t("title")}</h2><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{reminders.map((reminder) => <article className={styles.card} key={reminder.id}><span className={styles.medicineIcon}><Pill size={20} aria-hidden="true" /></span><div className={styles.cardBody}><strong className={styles.medicine}>{reminder.medicineName || t("medicineUnavailable")}</strong>{reminder.dose ? <span className={styles.dose}>{reminder.dose}</span> : null}{reminder.times.length ? <span className={styles.times}>{reminder.times.map((time) => <span className={styles.time} key={time}><Clock3 size={12} aria-hidden="true" />{time}</span>)}</span> : null}{reminder.frequency ? <span className={styles.frequency}>{reminder.frequency}</span> : null}</div></article>)}</section>}<p className={styles.notice}>{t("notice")}</p></main>;
}
