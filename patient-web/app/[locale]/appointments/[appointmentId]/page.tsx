import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractAppointmentDetail, parseAppointmentId } from "@/lib/api/appointments";
import { getPatientAppointment } from "@/lib/api/appointments-server";
import { callPatientApi } from "@/lib/api/upstream";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { isDone, isOpen, MODE_VISUAL, modeOf, statusKey, statusTone } from "@/lib/consult/appointment-view";
import { AppointmentActions } from "@/components-next/appointment-actions";
import { PrescriptionClient } from "@/components-next/prescription-client";
import { AppointmentRescheduleForm } from "@/components-next/appointment-reschedule-form";
import { CallTokenLauncher } from "@/components-next/call-token-launcher";
import { ConsultationPaymentAction } from "@/components-next/consultation-payment-action";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks, Facts, Hero, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; appointmentId: string }> };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
function text(record: Record<string, unknown> | null, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * One appointment (canvas/Appointments, opened): who, what, when, its status, and the actions the status allows. The one page
 * of the booking (merge map 2, section 1): after a finished visit it also holds the doctor's summary (was
 * /appointments/[id]/summary), the prescription (was /consultations/prescription) and the status history with the follow-up
 * (was /consultations/follow-up). All of it is GET /care/appointments/:id and GET /care/appointments/:id/summary.
 */
export default async function AppointmentDetailPage({ params }: Props) {
  const { locale, appointmentId } = await params;
  if (!isLocale(locale) || !parseAppointmentId(appointmentId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Appointments");
  const c = await getTranslations("ConsultWeb");
  const rs = await getTranslations("RouteState");
  const token = await requirePatientAccess(locale);
  const response = await getPatientAppointment(token, appointmentId);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const payload = response.ok ? await response.json().catch(() => null) : null;
  const appointment = response.ok ? extractAppointmentDetail(payload) : null;
  const raw = asRecord(payload);
  const record = asRecord(raw?.data) ?? raw;
  const back = `/${locale}/appointments`;
  if (!appointment) {
    return (
      <ConsultPage locale={locale} title={t("title")} backHref={back}>
        <ConsultState kind="error" title={t("unavailableTitle")} body={t("unavailableBody")} retryLabel={rs("retry")} />
      </ConsultPage>
    );
  }

  const mode = modeOf(appointment.serviceType);
  const visual = mode ? MODE_VISUAL[mode] : undefined;
  const serviceLabel = mode ? t(`services.${mode}`) : t("serviceUnavailable");
  const key = statusKey(appointment.status);
  const statusLabel = key ? c(`status.${key}`) : t("statusUnavailable");
  const insurancePending = appointment.insuranceReviewState === "PENDING_PROVIDER_REVIEW" || !appointment.insuranceReviewState;
  const id = encodeURIComponent(appointmentId);
  const open = isOpen(appointment.status);
  const done = isDone(appointment.status);
  const doctorId = text(record, "doctor_id") ?? text(record, "doctorId");
  const patientNotes = text(record, "patient_notes") ?? text(record, "patientNotes");
  const history = (Array.isArray(record?.state_history) ? record.state_history : []).flatMap((h) => {
    const r = asRecord(h);
    return r ? [{ state: text(r, "state") ?? "", at: text(r, "at") ?? "", note: text(r, "note") ?? "" }] : [];
  }).reverse();
  let summary: Record<string, unknown> | null = null;
  let summaryReady = false;
  if (done) {
    const sr = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}/summary`, {}, token);
    if (sr.status === 401) redirect(`/${locale}/login`);
    if (sr.ok) {
      const sraw = asRecord(await sr.json().catch(() => null));
      summary = asRecord(sraw?.data) ?? sraw;
      summaryReady = Boolean(summary);
    }
  }
  const diagnosis = text(summary, "diagnosis");
  const summaryNotes = text(summary, "notes");
  const recommendations = text(summary, "recommendations");
  const summaryMeds = Array.isArray(summary?.prescription) ? (summary.prescription as unknown[]) : [];
  const followUpRecommended = summary?.follow_up_recommended === true;
  const windowDays = typeof summary?.follow_up_window_days === "number" ? summary.follow_up_window_days : undefined;
  const followUpHref = doctorId ? `/${locale}/consultations/book/${encodeURIComponent(doctorId)}?followUp=${id}` : undefined;

  const rows: FactRow[] = [
    { label: t("service"), value: serviceLabel, icon: visual?.icon, tone: visual?.tone },
    { label: t("status"), value: statusLabel, icon: "check-circle", tone: statusTone(appointment.status) },
  ];
  if (appointment.slotStart) rows.push({ label: t("scheduled"), value: <LocalTimeLine iso={appointment.slotStart} locale={locale} />, icon: "calendar-dots", tone: SERVICE_ICONS.health.tone });
  if (appointment.specialty) rows.push({ label: t("specialty"), value: appointment.specialty, icon: "stethoscope", tone: "blue" });

  return (
    <ConsultPage locale={locale} title={appointment.doctorName || serviceLabel} backHref={back}>
      <Hero icon={visual?.icon} tone={visual?.tone} title={appointment.doctorName || serviceLabel} sub={appointment.specialty}>
        <span className={styles.chips}>
          {mode && visual ? <StatusChip label={serviceLabel} tone={visual.tone} /> : null}
          <StatusChip label={statusLabel} tone={statusTone(appointment.status)} />
        </span>
      </Hero>
      <SectionCard id="appointment-facts" title={t("title")}>
        <Facts rows={rows} />
        <p className={`${styles.body} ${styles.muted}`}>{t("detailNotice")}</p>
      </SectionCard>

      {appointment.paymentMethod === "insurance" && appointment.insuranceRequestId ? (
        <SectionCard id="appointment-insurance" title={insurancePending ? c("insurancePendingTitle") : c("insuranceDecidedTitle")}>
          <p className={styles.body}>{insurancePending ? c("insurancePendingBody") : c("insuranceDecidedBody")}</p>
          <ActionLinks actions={[{ href: `/${locale}/insurance/requests/${appointment.insuranceRequestId}`, label: c("insuranceView"), variant: "outline" }]} />
        </SectionCard>
      ) : null}

      {appointment.status === "PENDING" && appointment.paymentMethod === "card" ? <ConsultationPaymentAction appointmentId={appointmentId} /> : null}

      {open ? (
        <ActionLinks actions={[{ href: `/${locale}/consultations/booking-status?appointmentId=${id}`, label: c("actionBookingStatus"), variant: "outline" }]} />
      ) : null}
      {doctorId ? <ActionLinks actions={[{ href: `/${locale}/appointments/${id}/chat`, label: c("actionChatDoctor"), variant: "outline" }]} /> : null}

      {done ? (
        <>
          <SectionCard id="appointment-summary" title={c("summaryTitle")}>
            {!summaryReady ? <p className={`${styles.body} ${styles.muted}`}>{c("summaryPendingTitle")}. {c("summaryPendingBody")}</p> : null}
            {diagnosis ? <p className={styles.body}><strong>{c("summaryDiagnosis")}</strong>: {diagnosis}</p> : null}
            {summaryNotes ? <p className={styles.body}><strong>{c("summaryNotes")}</strong>: {summaryNotes}</p> : null}
            {recommendations ? <p className={styles.body}><strong>{c("summaryRecommendations")}</strong>: {recommendations}</p> : null}
            {summaryMeds.length > 0 ? (
              <ul className={styles.plain}>
                {summaryMeds.map((item, index) => {
                  const r = asRecord(item) ?? {};
                  const name = String(r.name ?? r.medicine_name ?? r.medication ?? r.drug ?? "");
                  return <li key={`${name}-${index}`}>{name}{typeof r.dose === "string" ? ` · ${r.dose}` : ""}</li>;
                })}
              </ul>
            ) : null}
            {followUpRecommended && windowDays !== undefined ? <p className={styles.body}>{c("summaryFollowUp", { days: windowDays })}. {c("summaryFollowUpBody")}</p> : null}
            <ActionLinks
              actions={[
                ...(followUpHref ? [{ href: followUpHref, label: c("actionBookFollowUp") }] : []),
                { href: `/${locale}/diagnostics/labs`, label: c("actionBookTests"), variant: "outline" as const },
                { href: `/${locale}/consultations/post-call-rating?appointmentId=${id}`, label: c("actionRate"), variant: "outline" as const },
              ]}
            />
          </SectionCard>
          <SectionCard id="appointment-prescription" title={c("prescriptionTitle")}>
            <PrescriptionClient locale={locale} appointmentId={appointmentId} />
          </SectionCard>
        </>
      ) : null}

      {patientNotes ? <SectionCard id="appointment-notes" title={c("patientNotesTitle")}><p className={styles.body}>{patientNotes}</p></SectionCard> : null}
      {history.length > 0 ? (
        <SectionCard id="appointment-history" title={c("historyTitle")}>
          <ul className={styles.plain}>
            {history.map((h, i) => {
              const known = statusKey(h.state);
              return (
                <li key={`${h.state}-${i}`}>
                  <span>
                    {known ? c(`status.${known}`) : t("statusUnavailable")}
                    {h.at && Number.isFinite(Date.parse(h.at)) ? <>{" · "}<LocalTimeLine iso={h.at} locale={locale} /></> : null}
                    {h.note ? ` · ${h.note}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      ) : null}

      {open ? (
        <>
          <AppointmentActions
            appointmentId={appointmentId}
            labels={{ actionsTitle: t("actionsTitle"), cancelAppointment: t("cancelAppointment"), cancelConfirm: t("cancelConfirm"), cancelReason: t("cancelReason"), keepAppointment: t("keepAppointment"), confirmCancel: t("confirmCancel"), cancelConflict: t("cancelConflict"), cancelFailed: t("cancelFailed"), cancelUnavailable: t("cancelUnavailable") }}
          />
          <AppointmentRescheduleForm
            appointmentId={appointmentId}
            labels={{ title: t("rescheduleTitle"), date: t("rescheduleDate"), reason: t("rescheduleReason"), submit: t("rescheduleSubmit"), cancel: t("rescheduleCancel"), conflict: t("rescheduleConflict"), failed: t("rescheduleFailed"), unavailable: t("rescheduleUnavailable"), invalid: t("rescheduleInvalid") }}
          />
          {appointment.serviceType === "video" ? (
            <CallTokenLauncher
              appointmentId={appointmentId}
              joinHref={`/${locale}/consultations/video-call?appointmentId=${id}`}
              labels={{ title: t("callTitle"), join: t("callJoin"), loading: t("callLoading"), ready: t("callReady"), unavailable: t("callUnavailable"), notReady: t("callDiscard"), open: t("callOpen") }}
            />
          ) : null}
        </>
      ) : null}
    </ConsultPage>
  );
}
