import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractMedicationReminderSummaries } from "@/lib/api/reminders";
import { getPatientMedicationReminders } from "@/lib/api/reminders-server";
import { parseChronicMedications } from "@/lib/api/chronic-meds";
import { getPatientChronicMedications } from "@/lib/api/chronic-meds-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/format-date";
import { isLocale } from "@/lib/i18n";
import { todayDoses } from "@/lib/health/doses";
import { isFlag, pickTab, CORAL } from "@/lib/health/view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { Notice } from "@/components-next/consult/consult-parts";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import { DoseRows } from "@/components-next/health/dose-rows";
import { FormSheet } from "@/components-next/health/form-sheet";
import { HealthTabs, RowsCard } from "@/components-next/health/health-kit";
import { DeleteReminderButton, RefillButton } from "@/components-next/health/reminder-actions";
import { ReminderForm } from "@/components-next/health/reminder-form";
import styles from "@/components-next/health/health.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string | string[]; add?: string | string[]; edit?: string | string[] }> };
const TABS = ["today", "all", "refills", "chronic"] as const;

/**
 * Medications (merge map, section 1): four tabs on one screen, `?tab=today|all|refills|chronic`. Today's doses, all reminders
 * (with edit and delete), the refills and the chronic medicines read the reminders endpoint (GET /health/reminders) and the
 * chronic one (GET /health/chronic-meds). "Add reminder" is a sheet (the old reminder form); `?add=1` and `?edit=<id>` open it.
 */
export default async function MedicationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("HealthWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const tab = pickTab(query.tab, TABS, "today");
  const base = `/${locale}/health/medications`;
  const here = `${base}?tab=${tab}`;
  const editId = Array.isArray(query.edit) ? query.edit[0] : query.edit;
  const pharmacy = SERVICE_ICONS.pharmacy;

  let response: Response;
  try { response = await (tab === "chronic" ? getPatientChronicMedications(token) : getPatientMedicationReminders(token)); } catch { response = new Response(null, { status: 503 }); }
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const payload = response.ok ? await response.json().catch(() => null) : null;
  const reminders = response.ok && tab !== "chronic" ? extractMedicationReminderSummaries(payload) : [];
  const editing = editId ? reminders.find((reminder) => reminder.id === editId) : undefined;

  const frame = (body: ReactNode) => (
    <ConsultPage locale={locale} title={t("medicationsTitle")} backHref={`/${locale}/health`}>
      <div className={styles.toolbar}>
        <span />
        <FormSheet title={t("reminderAdd")} triggerLabel={t("reminderAdd")} closeLabel={t("close")} defaultOpen={isFlag(query.add) && !editing} closeHref={here}>
          <ReminderForm />
        </FormSheet>
        {editing ? (
          <FormSheet title={t("reminderEdit")} triggerLabel={t("reminderEdit")} closeLabel={t("close")} defaultOpen closeHref={here} hideTrigger>
            <ReminderForm initial={{ id: editing.id, name: editing.medicineName ?? "", dose: editing.dose ?? "", times: editing.times.join(", "), frequency: editing.frequency ?? "daily" }} />
          </FormSheet>
        ) : null}
      </div>
      <HealthTabs label={t("medicationsTitle")} base={base} active={tab} options={[
        { value: "today", label: t("medsToday") },
        { value: "all", label: t("medsAll") },
        { value: "refills", label: t("medsRefills") },
        { value: "chronic", label: t("medsChronic") },
      ]} />
      {body}
    </ConsultPage>
  );

  if (!response.ok) return frame(<ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailable")} retryLabel={rs("retry")} />);
  const empty = (body: string) => <ConsultState kind="empty" icon="pill" title={t("medicationsTitle")} body={body} />;
  const medicineName = (name?: string) => name ?? t("medicineUnavailable");
  const freq = (value: string) => (["daily", "weekly", "as_needed"].includes(value) ? t(`frequency.${value}`) : value);

  if (tab === "today") {
    const doses = todayDoses(reminders);
    if (doses.length === 0) return frame(empty(t("todayEmpty")));
    const statuses = { taken: t("dose.taken"), pending: t("dose.pending"), skipped: t("dose.skipped"), missed: t("dose.missed") };
    const taken = doses.filter((dose) => dose.status === "taken").length;
    return frame(
      <>
        <p className={styles.rowSub} role="status">{t("dosesTaken", { taken, total: doses.length })}</p>
        <RowsCard label={t("medsToday")}><DoseRows rows={doses} labels={{ statuses, medicineUnavailable: t("medicineUnavailable") }} withAction /></RowsCard>
        <Notice>{t("medsNotice")}</Notice>
      </>,
    );
  }

  if (tab === "all" || tab === "refills") {
    if (reminders.length === 0) return frame(empty(tab === "all" ? t("remindersEmpty") : t("refillsEmpty")));
    return frame(
      <>
        <RowsCard label={tab === "all" ? t("medsAll") : t("medsRefills")}>
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <div className={styles.row}>
                <FIcon icon={pharmacy.icon} tone={pharmacy.tone} size={40} />
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{medicineName(reminder.medicineName)}</span>
                  {reminder.dose ? <span className={styles.rowSub}><bdi>{reminder.dose}</bdi></span> : null}
                  {tab === "all" && reminder.times.length ? <span className={styles.times}>{reminder.times.map((time) => <span className={styles.time} key={time}>{time}</span>)}</span> : null}
                  {tab === "all" && reminder.frequency ? <span className={styles.rowSub}>{freq(reminder.frequency)}</span> : null}
                </span>
                {tab === "refills" ? (
                  <RefillButton id={reminder.id} />
                ) : (
                  <span className={styles.rowActions}>
                    <ButtonLink href={`${base}?tab=all&edit=${encodeURIComponent(reminder.id)}`} label={t("reminderEdit")} variant="ghost" size="sm" />
                    <DeleteReminderButton id={reminder.id} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </RowsCard>
        <Notice>{t("medsNotice")}</Notice>
      </>,
    );
  }

  const chronic = parseChronicMedications(payload);
  if (chronic.length === 0) return frame(empty(t("chronicEmpty")));
  return frame(
    <>
      <RowsCard label={t("medsChronic")}>
        {chronic.map((med) => {
          const refill = formatDate(locale, med.refillDate);
          return (
            <li key={med.id}>
              <div className={styles.row}>
                <FIcon icon={pharmacy.icon} tone={pharmacy.tone} size={40} />
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{med.name ?? t("medicineUnnamed")}</span>
                  {[med.dose, med.frequency].filter(Boolean).length ? <span className={styles.rowSub}>{med.dose ? <bdi>{med.dose}</bdi> : null}{med.dose && med.frequency ? " · " : ""}{med.frequency ? freq(med.frequency) : null}</span> : null}
                  {med.times.length ? <span className={styles.times}>{med.times.map((time) => <span className={styles.time} key={time}>{time}</span>)}</span> : null}
                  {refill ? <span className={styles.rowSub}>{t("refillOn", { date: refill })}{med.daysUntilRefill !== undefined ? ` · ${t("refillInDays", { count: med.daysUntilRefill })}` : ""}</span> : null}
                  {med.pillsRemaining !== undefined ? <span className={styles.rowSub}>{t("unitsRemaining", { count: med.pillsRemaining })}</span> : null}
                  <span className={styles.times}>
                    <StatusChip label={med.active ? t("chronicActive") : t("chronicInactive")} tone={med.active ? "mint" : "amber"} />
                    {med.needsRefillSoon ? <StatusChip label={t("refillSoon")} tone={CORAL} /> : null}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </RowsCard>
      <Notice>{t("chronicNotice")}</Notice>
    </>,
  );
}
