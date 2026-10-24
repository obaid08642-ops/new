import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { extractAppointmentDetail } from "@/lib/api/appointments";
import { APPOINTMENT_ID, MODE_VISUAL, isOpen, modeOf } from "@/lib/consult/appointment-view";
import { AppointmentActions } from "@/components-next/appointment-actions";
import { AppointmentRescheduleForm } from "@/components-next/appointment-reschedule-form";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { Hero } from "@/components-next/consult/consult-parts";
import { PolicyCard, policyLines } from "@/components-next/consult/policy-lines";
import { getCancellationPolicy, refundPercent } from "@/lib/consult/cancellation-policy";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string; id?: string }> };

/** Cancel or reschedule one appointment: the appointment, the refund policy, a new time, and the cancellation. */
export default async function ConsultationCancelReschedulePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  if (!isLocale(locale) || !APPOINTMENT_ID.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const c = await getTranslations("ConsultWeb");
  const a = await getTranslations("Appointments");
  const b = await getTranslations("BookConsultation");
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (!response.ok) notFound();
  const appointment = extractAppointmentDetail(await response.json().catch(() => null));
  if (!appointment) notFound();

  // Only an open appointment can change; a finished or cancelled one opened by its link goes back to its page.
  if (!isOpen(appointment.status)) redirect(`/${locale}/appointments/${encodeURIComponent(appointmentId)}`);
  const slotMs = appointment.slotStart ? Date.parse(appointment.slotStart) : NaN;
  const hoursUntil = Number.isFinite(slotMs) ? (slotMs - Date.now()) / 3600000 : null;
  // The rule is the server's (public system configuration); the screen only reads its numbers and never writes one.
  const policy = await getCancellationPolicy(token);
  const refundPct = refundPercent(hoursUntil, policy);
  const mode = modeOf(appointment.serviceType);
  const visual = mode ? MODE_VISUAL[mode] : undefined;

  return (
    <ConsultPage locale={locale} title={c("cancelTitle")} backHref={`/${locale}/appointments/${encodeURIComponent(appointmentId)}`}>
      <Hero icon={visual?.icon} tone={visual?.tone} title={appointment.doctorName ?? (mode ? a(`services.${mode}`) : a("serviceUnavailable"))} sub={appointment.specialty}>
        {Number.isFinite(slotMs) && appointment.slotStart ? <LocalTimeLine iso={appointment.slotStart} locale={locale} className={styles.heroSub} /> : null}
      </Hero>
      {refundPct !== null ? <p className={styles.ok} role="status">{c("expectedRefund", { percent: refundPct })}</p> : null}
      <PolicyCard title={c("policyTitle")} lines={policyLines(c, policy)} />
      {appointment.doctorId && mode ? (
        <AppointmentRescheduleForm
          appointmentId={appointmentId}
          doctorId={appointment.doctorId}
          serviceType={mode}
          locale={locale}
          labels={{ title: a("rescheduleTitle"), date: b("selectDay"), slots: b("slotsLabel"), reason: a("rescheduleReason"), submit: a("rescheduleSubmit"), cancel: a("rescheduleCancel"), conflict: a("rescheduleConflict"), failed: a("rescheduleFailed"), unavailable: a("rescheduleUnavailable"), invalid: a("rescheduleInvalid"), today: b("today"), loading: b("loadingSlots"), noSlots: b("noSlots"), slotsUnavailable: b("slotsUnavailable") }}
        />
      ) : null}
      <AppointmentActions
        appointmentId={appointmentId}
        labels={{ actionsTitle: a("actionsTitle"), cancelAppointment: a("cancelAppointment"), cancelConfirm: a("cancelConfirm"), cancelReason: a("cancelReason"), keepAppointment: a("keepAppointment"), confirmCancel: a("confirmCancel"), cancelConflict: a("cancelConflict"), cancelFailed: a("cancelFailed"), cancelUnavailable: a("cancelUnavailable"), myAppointments: c("actionMyAppointments"), reasonTitle: a("cancelReasonTitle"), reasons: { emergency: a("cancelReasons.emergency"), better: a("cancelReasons.better"), otherDoctor: a("cancelReasons.otherDoctor"), time: a("cancelReasons.time"), payment: a("cancelReasons.payment"), other: a("cancelReasons.other") } }}
        locale={locale}
        refundText={{ refunded: a("cancelledRefund", { amount: "{amount}", percent: "{percent}" }), noRefund: a("cancelledNoRefund"), notCharged: a("cancelledNotCharged") }}
      />
    </ConsultPage>
  );
}
