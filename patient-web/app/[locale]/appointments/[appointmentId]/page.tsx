import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractAppointmentDetail, parseAppointmentId } from "@/lib/api/appointments";
import { getPatientAppointment } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { isDone, isOpen, MODE_VISUAL, modeOf, statusKey, statusTone } from "@/lib/consult/appointment-view";
import { AppointmentActions } from "@/components-next/appointment-actions";
import { AppointmentRescheduleForm } from "@/components-next/appointment-reschedule-form";
import { CallTokenLauncher } from "@/components-next/call-token-launcher";
import { ConsultationPaymentAction } from "@/components-next/consultation-payment-action";
import { ConsultPage } from "@/components-next/consult/consult-page";
import { ConsultState } from "@/components-next/consult/consult-state";
import { ActionLinks, Facts, Hero, SectionCard, type FactRow } from "@/components-next/consult/consult-parts";
import { LocalTimeLine } from "@/components-next/consult/local-time-line";
import { StatusChip } from "@/components-next/ui-generated/components/Controls";
import styles from "@/components-next/consult/consult.module.css";

type Props = { params: Promise<{ locale: string; appointmentId: string }> };

/** One appointment (canvas/Appointments, opened): who, what, when, its status, and the actions the status allows. */
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
  const appointment = response.ok ? extractAppointmentDetail(await response.json().catch(() => null)) : null;
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

  const rows: FactRow[] = [
    { label: t("service"), value: serviceLabel, icon: visual?.icon, tone: visual?.tone },
    { label: t("status"), value: statusLabel, icon: "check-circle", tone: statusTone(appointment.status) },
  ];
  if (appointment.slotStart) rows.push({ label: t("scheduled"), value: <LocalTimeLine iso={appointment.slotStart} locale={locale} />, icon: "calendar-dots", tone: "coral" });
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
      {isDone(appointment.status) ? (
        <ActionLinks
          actions={[
            { href: `/${locale}/appointments/${id}/summary`, label: c("actionSummary") },
            { href: `/${locale}/prescriptions`, label: c("actionPrescriptions"), variant: "outline" },
          ]}
        />
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
              labels={{ title: t("callTitle"), join: t("callJoin"), loading: t("callLoading"), ready: t("callReady"), unavailable: t("callUnavailable"), notReady: t("callDiscard") }}
            />
          ) : null}
        </>
      ) : null}
    </ConsultPage>
  );
}
