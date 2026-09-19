import Link from "next/link";
import { VectorDoctor } from "@/components-next/vector-illustrations";
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
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <Link href={`/${locale}/appointments/${appointmentId}`} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", fontWeight: 700, textDecoration: "none", width: "fit-content" }}>{ar ? "الموعد" : "Appointment"}</Link>
      <section style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p style={{ color: "#1E332E", fontSize: ".78rem", fontWeight: 760, margin: 0, overflowWrap: "anywhere" } as any}>{ar ? "إلغاء / إعادة جدولة" : "Cancel / reschedule"}</p>
          <h1 style={{ color: "#1E332E", margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "إلغاء / إعادة جدولة الموعد" : "Cancel / reschedule appointment"}</h1>
        </div>
        <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true"><VectorDoctor size={48} aria-hidden="true" /></span>
      </section>
      <section aria-label={ar ? "ملخص الموعد" : "Appointment summary"} style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "grid", gap: 8 }}>
        {appointment.doctorName ? <p style={{ color: "#1E332E", margin: 0, fontWeight: 700, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}><strong>{appointment.doctorName}</strong></p> : null}
        {when ? <p style={{ color: "#6B7C6E", margin: 0, overflowWrap: "anywhere" } as any}>{when}</p> : null}
        {refundPct !== null ? <p role="status" style={{ color: "#1E332E", margin: 0, fontWeight: 700, overflowWrap: "anywhere" } as any}>{ar ? `الاسترداد المتوقع: ${refundPct}%` : `Expected refund: ${refundPct}%`}</p> : null}
      </section>
      <section aria-label={ar ? "سياسة الإلغاء" : "Cancellation policy"} style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "grid", gap: 8 }}>
        <h2 style={{ color: "#1E332E", margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "سياسة الإلغاء والاسترداد" : "Cancellation & refund policy"}</h2>
        <ul style={{ margin: 0, paddingInlineStart: 16, display: "grid", gap: 8, color: "#6B7C6E" }}>
          <li style={{ overflowWrap: "anywhere" } as any}>{ar ? "قبل 24 ساعة: استرداد 100%" : "More than 24h before: 100% refund"}</li>
          <li style={{ overflowWrap: "anywhere" } as any}>{ar ? "قبل 12-24 ساعة: استرداد 50%" : "12–24h before: 50% refund"}</li>
          <li style={{ overflowWrap: "anywhere" } as any}>{ar ? "أقل من 12 ساعة: لا يوجد استرداد" : "Less than 12h: no refund"}</li>
        </ul>
      </section>
      <div style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "grid", gap: 8 }}>
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
      </div>
      <div style={{ background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "grid", gap: 8 }}>
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
      </div>
    </main>
  );
}
