import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { extractAppointmentDetail } from "@/lib/api/appointments";
import { AppointmentActions } from "@/components-next/appointment-actions";
import { AppointmentRescheduleForm } from "@/components-next/appointment-reschedule-form";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string; id?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parity with app cancel-reschedule: choose mode + refund policy + cancel reasons + 7-day reschedule. */
export default async function ConsultationCancelReschedulePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  if (!isLocale(locale) || !idPattern.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) notFound();
  const appointment = extractAppointmentDetail(await response.json().catch(() => null));
  if (!appointment) notFound();

  const slotMs = appointment.slotStart ? Date.parse(appointment.slotStart) : NaN;
  const hoursUntil = Number.isFinite(slotMs) ? (slotMs - Date.now()) / 3600000 : null;
  const refundPct = hoursUntil === null ? null : hoursUntil >= 24 ? 100 : hoursUntil >= 12 ? 50 : 0;
  const when = Number.isFinite(slotMs)
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(slotMs))
    : null;

  return (
    <main className="main">
      <Link href={`/${locale}/appointments/${appointmentId}`}>{ar ? "الموعد" : "Appointment"}</Link>
      <h1>{ar ? "إلغاء / إعادة جدولة الموعد" : "Cancel / reschedule appointment"}</h1>
      <section aria-label={ar ? "ملخص الموعد" : "Appointment summary"}>
        {appointment.doctorName ? <p><strong>{appointment.doctorName}</strong></p> : null}
        {when ? <p>{when}</p> : null}
        {refundPct !== null ? <p role="status">{ar ? `الاسترداد المتوقع: ${refundPct}%` : `Expected refund: ${refundPct}%`}</p> : null}
      </section>
      <section aria-label={ar ? "سياسة الإلغاء" : "Cancellation policy"}>
        <h2>{ar ? "سياسة الإلغاء والاسترداد" : "Cancellation & refund policy"}</h2>
        <ul>
          <li>{ar ? "قبل 24 ساعة: استرداد 100%" : "More than 24h before: 100% refund"}</li>
          <li>{ar ? "قبل 12-24 ساعة: استرداد 50%" : "12–24h before: 50% refund"}</li>
          <li>{ar ? "أقل من 12 ساعة: لا يوجد استرداد" : "Less than 12h: no refund"}</li>
        </ul>
      </section>
      <AppointmentRescheduleForm
        appointmentId={appointmentId}
        labels={{
          title: ar ? "إعادة الجدولة (موصى به)" : "Reschedule (recommended)",
          date: ar ? "الموعد الجديد" : "New date & time",
          reason: ar ? "السبب" : "Reason",
          submit: ar ? "تأكيد الموعد الجديد" : "Confirm new appointment",
          cancel: ar ? "تراجع" : "Back",
          conflict: ar ? "الموعد الجديد غير متاح" : "New slot unavailable",
          failed: ar ? "تعذر إعادة الجدولة" : "Reschedule failed",
          unavailable: ar ? "تعذر الاتصال" : "Connection unavailable",
          invalid: ar ? "اختر وقتاً متاحاً" : "Choose an available time",
        }}
      />
      <AppointmentActions
        appointmentId={appointmentId}
        labels={{
          actionsTitle: ar ? "إلغاء الموعد" : "Cancel appointment",
          cancelAppointment: ar ? "إلغاء الموعد" : "Cancel appointment",
          cancelConfirm: ar ? "هل أنت متأكد من إلغاء هذا الموعد؟" : "Are you sure you want to cancel?",
          cancelReason: ar ? "سبب الإلغاء" : "Cancellation reason",
          keepAppointment: ar ? "إبقاء الموعد" : "Keep appointment",
          confirmCancel: ar ? "تأكيد الإلغاء" : "Confirm cancellation",
          cancelConflict: ar ? "تعذر الإلغاء حالياً" : "Cannot cancel right now",
          cancelFailed: ar ? "فشل الإلغاء" : "Cancellation failed",
          cancelUnavailable: ar ? "تعذر الاتصال" : "Connection unavailable",
        }}
      />
    </main>
  );
}
