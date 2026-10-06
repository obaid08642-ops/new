import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { APPOINTMENT_ID, MODE_VISUAL, statusKey, statusTone, type Mode } from "@/lib/consult/appointment-view";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ActionLinks, Hero, SectionCard, type LinkAction } from "@/components-next/consult/consult-parts";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string; id?: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
function text(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

/** Parity with app follow-up: real appointment + doctor + prescriptions + state history + actions. */
export default async function ConsultationFollowUpPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  if (!isLocale(locale) || !APPOINTMENT_ID.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const c = await getTranslations("ConsultWeb");
  const a = await getTranslations("Appointments");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const raw = asRecord(await response.json().catch(() => null));
  const appt = asRecord(raw?.data) ?? raw;
  if (!appt?.id) notFound();

  const status = text(appt, ["status"]) ?? "";
  const isCompleted = status === "COMPLETED";
  const doctorId = text(appt, ["doctor_id", "doctorId"]);
  const doctorName = text(appt, ["doctor_name", "doctorName"]) ?? c("doctorFallback");
  const slotStart = text(appt, ["slot_start", "slotStart"]);
  const serviceType = text(appt, ["service_type", "serviceType"]);
  const visitMode: Mode = serviceType === "video" ? "video" : serviceType === "home" ? "home" : "clinic";
  const patientNotes = text(appt, ["patient_notes", "patientNotes"]);
  const prescriptionsRaw = Array.isArray(appt.prescriptions) ? appt.prescriptions : [];
  const prescriptions: string[] = prescriptionsRaw
    .map((p) => (typeof p === "string" ? p : text(asRecord(p) ?? {}, ["name"])))
    .filter((p): p is string => !!p);
  const historyRaw = Array.isArray(appt.state_history) ? appt.state_history : [];
  const history = historyRaw.flatMap((h) => {
    const r = asRecord(h);
    if (!r) return [];
    return [{ state: text(r, ["state"]) ?? "", at: text(r, ["at"]) ?? "", note: text(r, ["note"]) ?? "" }];
  }).reverse();

  const visual = MODE_VISUAL[visitMode];
  const statusKnown = statusKey(status);
  const id = encodeURIComponent(appointmentId);
  const actions: LinkAction[] = [];
  if (doctorId) actions.push({ href: `/${locale}/consultations/book/${encodeURIComponent(doctorId)}`, label: c("actionBookFollowUp") }, { href: `/${locale}/consultations/chat?doctorId=${encodeURIComponent(doctorId)}`, label: c("actionChatDoctor"), variant: "outline" });

  return (
    <ConsultPage locale={locale} title={c("followUpTitle")} backHref={`/${locale}/appointments/${id}`}>
      <Hero icon={visual.icon} tone={visual.tone} title={doctorName} sub={a(`services.${visitMode}`)}>
        {slotStart && Number.isFinite(Date.parse(slotStart)) ? <LocalTimeLine iso={slotStart} locale={locale} className={styles.heroSub} /> : null}
        <span className={styles.chips}><StatusChip label={statusKnown ? c(`status.${statusKnown}`) : a("statusUnavailable")} tone={statusTone(status)} /></span>
      </Hero>
      {patientNotes ? <SectionCard id="follow-notes" title={c("patientNotesTitle")}><p className={styles.body}>{patientNotes}</p></SectionCard> : null}
      <SectionCard id="follow-meds" title={c("prescribedTitle")}>
        {prescriptions.length === 0 ? (
          <p className={`${styles.body} ${styles.muted}`}>{isCompleted ? c("noMedsDone") : c("noMedsPending")}</p>
        ) : (
          <ul className={styles.plain}>{prescriptions.map((name) => <li key={name}>{name}</li>)}</ul>
        )}
        {prescriptions.length > 0 ? <ActionLinks actions={[{ href: `/${locale}/pharmacy`, label: c("actionOrderMedicines"), variant: "outline" }]} /> : null}
      </SectionCard>
      <SectionCard id="follow-history" title={c("historyTitle")}>
        {history.length === 0 ? (
          <p className={`${styles.body} ${styles.muted}`}>{c("historyEmpty")}</p>
        ) : (
          <ul className={styles.plain}>
            {history.map((h, i) => {
              const known = statusKey(h.state);
              return (
                <li key={`${h.state}-${i}`}>
                  <span>
                    {known ? c(`status.${known}`) : a("statusUnavailable")}
                    {h.at && Number.isFinite(Date.parse(h.at)) ? <>{" · "}<LocalTimeLine iso={h.at} locale={locale} /></> : null}
                    {h.note ? ` · ${h.note}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
      <ActionLinks actions={actions} />
    </ConsultPage>
  );
}
