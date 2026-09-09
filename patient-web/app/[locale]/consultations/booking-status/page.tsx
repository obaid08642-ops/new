import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { extractAppointmentDetail } from "@/lib/api/appointments";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ConsultationBookingStatusPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || "").trim();
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
  const status = (appointment.status || "").toLowerCase();
  const isVideo = appointment.serviceType === "video";
  const active = ["confirmed", "scheduled", "in_progress", "checked_in"].includes(status);

  return (
    <main className="main">
      <Link href={`/${locale}/appointments/${appointmentId}`}>{ar ? "الموعد" : "Appointment"}</Link>
      <h1>{ar ? "حالة الحجز" : "Booking status"}</h1>
      <p role="status">
        {ar ? "الحالة:" : "Status:"} {appointment.status || (ar ? "غير متاحة" : "Unavailable")}
        {appointment.doctorName ? ` — ${appointment.doctorName}` : ""}
      </p>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-label={ar ? "الخطوة التالية" : "Next step"}>
        {active && isVideo ? (
          <Link href={`/${locale}/consultations/virtual-waiting-room?appointmentId=${encodeURIComponent(appointmentId)}`}>
            {ar ? "دخول غرفة الانتظار" : "Enter waiting room"}
          </Link>
        ) : null}
        {active && !isVideo ? (
          <Link href={`/${locale}/appointments/${appointmentId}`}>{ar ? "تفاصيل الموعد" : "Appointment details"}</Link>
        ) : null}
        {["completed", "complete", "finished", "done"].includes(status) ? (
          <Link href={`/${locale}/appointments/${appointmentId}/summary`}>{ar ? "ملخص الاستشارة" : "Visit summary"}</Link>
        ) : null}
        <Link href={`/${locale}/appointments`}>{ar ? "مواعيدي" : "My appointments"}</Link>
      </nav>
    </main>
  );
}
