import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicationReminderSummaries } from "@/lib/api/reminders";
import { getPatientMedicationReminders } from "@/lib/api/reminders-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";

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
  if (!response.ok) return <main className="main dashboard"><section className="status-card" role="alert"><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p></section></main>;
  const reminders = extractMedicationReminderSummaries(await response.json().catch(() => null));
  return <main className="main dashboard"><div className="eyebrow">{t("eyebrow")}</div><h1>{t("title")}</h1>{reminders.length === 0 ? <section className="status-card"><p>{t("empty")}</p></section> : <section className="reminder-grid" aria-label={t("title")}>{reminders.map((reminder) => <article className="reminder-card" key={reminder.id}><strong>{reminder.medicineName || t("medicineUnavailable")}</strong>{reminder.dose ? <span>{reminder.dose}</span> : null}{reminder.times.length ? <span>{t("times", { value: reminder.times.join(" · ") })}</span> : null}{reminder.frequency ? <span>{reminder.frequency}</span> : null}</article>)}</section>}<p className="privacy-notice">{t("notice")}</p></main>;
}
