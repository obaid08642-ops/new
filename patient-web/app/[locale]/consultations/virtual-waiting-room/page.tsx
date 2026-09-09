import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";
import { extractAppointmentDetail } from "@/lib/api/appointments";
import { CallTokenLauncher } from "@/components-next/call-token-launcher";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function VirtualWaitingRoomPage({ params, searchParams }: Props) {
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
  const joinable = ["confirmed", "scheduled", "in_progress", "checked_in"].includes(status);

  return (
    <main className="main">
      <Link href={`/${locale}/appointments/${appointmentId}`}>{ar ? "الموعد" : "Appointment"}</Link>
      <h1>{ar ? "غرفة الانتظار الافتراضية" : "Virtual waiting room"}</h1>
      <p role="status">
        {ar ? "الحالة:" : "Status:"} {appointment.status || (ar ? "غير متاحة" : "Unavailable")}
        {appointment.doctorName ? ` — ${appointment.doctorName}` : ""}
      </p>
      {joinable ? (
        <CallTokenLauncher
          appointmentId={appointmentId}
          labels={{
            title: ar ? "الانضمام للمكالمة" : "Join the call",
            join: ar ? "انضمام الآن" : "Join now",
            loading: ar ? "جارٍ التجهيز..." : "Preparing...",
            ready: ar ? "الغرفة جاهزة" : "Room ready",
            unavailable: ar ? "المكالمة غير متاحة بعد" : "Call not available yet",
            notReady: ar ? "إلغاء" : "Cancel",
          }}
        />
      ) : (
        <p>{ar ? "ستُفتح المكالمة عند تأكيد الموعد واقتراب موعده." : "The call opens once the appointment is confirmed and due."}</p>
      )}
    </main>
  );
}
