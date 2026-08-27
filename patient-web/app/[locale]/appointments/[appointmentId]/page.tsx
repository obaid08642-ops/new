import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { extractAppointmentDetail, parseAppointmentId } from "@/lib/api/appointments";
import { getPatientAppointment } from "@/lib/api/appointments-server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { RetryButton } from "@/components-next/retry-button";
import { AppointmentActions } from "@/components-next/appointment-actions";
import { AppointmentRescheduleForm } from "@/components-next/appointment-reschedule-form";
import { CallTokenLauncher } from "@/components-next/call-token-launcher";
import { ConsultationPaymentAction } from "@/components-next/consultation-payment-action";
import { CalendarDays, ChevronLeft, ShieldCheck, Stethoscope } from "lucide-react";
import styles from "./appointment-detail.module.css";

type Props = { params: Promise<{ locale: string; appointmentId: string }> };

export default async function AppointmentDetailPage({ params }: Props) {
  const { locale, appointmentId } = await params;
  if (!isLocale(locale) || !parseAppointmentId(appointmentId).success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Appointments");
  const token = await requirePatientAccess(locale);
  const response = await getPatientAppointment(token, appointmentId);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const appointment = extractAppointmentDetail(await response.json().catch(() => null));
  if (!appointment) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><Stethoscope size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section></main>;
  const serviceLabel = appointment.serviceType === "clinic" ? t("services.clinic") : appointment.serviceType === "video" ? t("services.video") : appointment.serviceType === "home" ? t("services.home") : t("serviceUnavailable");
  const status = appointment.status || t("statusUnavailable");
  const insurancePending = appointment.insuranceReviewState === "PENDING_PROVIDER_REVIEW" || !appointment.insuranceReviewState;
  return <main className={`main ${styles.page}`}>
    <Link className={styles.back} href={`/${locale}/appointments`}><ChevronLeft size={17} aria-hidden="true" />{t("back")}</Link>
    <section className={styles.hero}>
      <div className={styles.heroText}><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />{t("eyebrow")}</p><h1>{appointment.doctorName || serviceLabel}</h1><span className={styles.status}>{status}</span></div>
      <span className={styles.heroIcon}><Stethoscope size={28} aria-hidden="true" /></span>
    </section>
    <section className={styles.detail} aria-label={t("title")}><dl className={styles.grid}>
      <div className={styles.item}><dt>{t("service")}</dt><dd>{serviceLabel}</dd></div>
      <div className={styles.item}><dt>{t("status")}</dt><dd>{status}</dd></div>
      {appointment.slotStart ? <div className={styles.item}><dt><CalendarDays size={15} aria-hidden="true" />{t("scheduled")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.slotStart))}</dd></div> : null}
      {appointment.specialty ? <div className={styles.item}><dt>{t("specialty")}</dt><dd>{appointment.specialty}</dd></div> : null}
    </dl><p className={styles.notice}>{t("detailNotice")}</p></section>
    {appointment.paymentMethod === "insurance" && appointment.insuranceRequestId ? <section className={styles.detail} aria-label="حالة التأمين"><p className={styles.eyebrow}><ShieldCheck size={15} aria-hidden="true" />التأمين</p><h2>{insurancePending ? "طلب التأمين قيد المراجعة" : "تم تسجيل قرار التأمين"}</h2><p className={styles.notice}>الحالة المسجلة خادمياً: {appointment.insuranceReviewState || "PENDING_PROVIDER_REVIEW"}. {insurancePending ? "لا يوجد دفع أو تأكيد قبل قرار مزود الخدمة والتحقق الخادمي عند وجود نسبة تحمّل." : "تتحدد خطوة الدفع أو التأكيد من الخادم بحسب القرار المسجل، ولا يعدّ هذا العرض تأكيداً للدفع."}</p></section> : null}
    {appointment.status === "PENDING" && appointment.paymentMethod === "card" ? <ConsultationPaymentAction appointmentId={appointmentId} /> : null}
    {["pending", "pending_payment", "confirmed", "scheduled"].includes((appointment.status ?? "").toLowerCase()) ? <><AppointmentActions appointmentId={appointmentId} labels={{ actionsTitle: t("actionsTitle"), cancelAppointment: t("cancelAppointment"), cancelConfirm: t("cancelConfirm"), cancelReason: t("cancelReason"), keepAppointment: t("keepAppointment"), confirmCancel: t("confirmCancel"), cancelConflict: t("cancelConflict"), cancelFailed: t("cancelFailed"), cancelUnavailable: t("cancelUnavailable") }} /><AppointmentRescheduleForm appointmentId={appointmentId} labels={{ title: t("rescheduleTitle"), date: t("rescheduleDate"), reason: t("rescheduleReason"), submit: t("rescheduleSubmit"), cancel: t("rescheduleCancel"), conflict: t("rescheduleConflict"), failed: t("rescheduleFailed"), unavailable: t("rescheduleUnavailable"), invalid: t("rescheduleInvalid") }} />{appointment.serviceType === "video" ? <CallTokenLauncher appointmentId={appointmentId} labels={{ title: t("callTitle"), join: t("callJoin"), loading: t("callLoading"), ready: t("callReady"), unavailable: t("callUnavailable"), notReady: t("callDiscard") }} /> : null}</> : null}
  </main>;
}
