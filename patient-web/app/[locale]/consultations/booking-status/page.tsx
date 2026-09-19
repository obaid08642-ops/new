import Link from "next/link";
import { VectorDoctor } from "@/components-next/vector-illustrations";
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
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 }}>
      <Link href={`/${locale}/appointments/${appointmentId}`} style={{ color: "#1E332E", display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #E8EDEE", borderRadius: 20, padding: "8px 16px", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", fontWeight: 700, textDecoration: "none", width: "fit-content" }}>{ar ? "الموعد" : "Appointment"}</Link>
      <section style={{ background: "rgba(255,255,255,.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid #E8EDEE", borderRadius: 20, padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <p style={{ color: "#1E332E", fontSize: ".78rem", fontWeight: 760, margin: 0, overflowWrap: "anywhere" } as any}>{ar ? "حالة الحجز" : "Booking status"}</p>
          <h1 style={{ color: "#1E332E", margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "حالة الحجز" : "Booking status"}</h1>
          <p role="status" style={{ color: "#6B7C6E", margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
            {ar ? "الحالة:" : "Status:"} {appointment.status || (ar ? "غير متاحة" : "Unavailable")}
            {appointment.doctorName ? ` — ${appointment.doctorName}` : ""}
          </p>
        </div>
        <span style={{ inlineSize: 48, blockSize: 48, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true"><VectorDoctor size={48} aria-hidden="true" /></span>
      </section>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-label={ar ? "الخطوة التالية" : "Next step"}>
        {active && isVideo ? (
          <Link href={`/${locale}/consultations/virtual-waiting-room?appointmentId=${encodeURIComponent(appointmentId)}`} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "10px 16px", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" } as any}>
            {ar ? "دخول غرفة الانتظار" : "Enter waiting room"}
          </Link>
        ) : null}
        {active && !isVideo ? (
          <Link href={`/${locale}/appointments/${appointmentId}`} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "10px 16px", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" } as any}>{ar ? "تفاصيل الموعد" : "Appointment details"}</Link>
        ) : null}
        {["completed", "complete", "finished", "done"].includes(status) ? (
          <Link href={`/${locale}/appointments/${appointmentId}/summary`} style={{ background: "#5FD9B3", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "10px 16px", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere" } as any}>{ar ? "ملخص الاستشارة" : "Visit summary"}</Link>
        ) : null}
        <Link href={`/${locale}/appointments`} style={{ background: "rgba(255,255,255,.82)", color: "#1E332E", borderRadius: 20, border: "1px solid #E8EDEE", padding: "10px 16px", fontWeight: 700, textDecoration: "none", overflowWrap: "anywhere", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>{ar ? "مواعيدي" : "My appointments"}</Link>
      </nav>
    </main>
  );
}
