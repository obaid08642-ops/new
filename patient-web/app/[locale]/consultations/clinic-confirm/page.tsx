import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ appointmentId?: string; id?: string; view?: string }>;
};
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

/** Parity with app clinic-confirm (+ clinic-location via ?view=location): booking code, clinic, prep, policy. */
export default async function ConsultationClinicConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  if (!isLocale(locale) || !idPattern.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const locationView = sp.view === "location";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) notFound();
  const raw = asRecord(await response.json().catch(() => null));
  const appt = asRecord(raw?.data) ?? raw;
  if (!appt?.id) notFound();

  let doctor: Record<string, unknown> | null = null;
  const doctorId = text(appt, ["doctor_id", "doctorId"]);
  if (doctorId) {
    const dr = await callPatientApi(`/care/doctors/${encodeURIComponent(doctorId)}`, {}, token);
    if (dr.ok) {
      const draw = asRecord(await dr.json().catch(() => null));
      doctor = asRecord(draw?.data) ?? draw;
    }
  }
  const facility = asRecord(appt.facility) ?? asRecord(doctor?.facility) ?? null;
  const bookingCode = String(appt.id).toUpperCase();
  const slotStart = text(appt, ["slot_start", "slotStart"]);
  const when = slotStart && Number.isFinite(Date.parse(slotStart))
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(slotStart))
    : null;
  const clinicName = (facility && text(facility, ["name", "name_ar"])) || (doctor && text(doctor, ["clinic_name", "clinicName"])) || (ar ? "العيادة" : "Clinic");
  const address = (facility && text(facility, ["address", "address_ar"])) || (doctor && text(doctor, ["clinic_address", "clinicAddress"]));
  const phone = (facility && text(facility, ["phone"])) || (doctor && text(doctor, ["clinic_phone", "clinicPhone", "phone"]));
  const loc = asRecord(facility?.location) ?? asRecord(doctor?.location);
  const lat = typeof loc?.lat === "number" ? loc.lat : null;
  const lng = typeof loc?.lng === "number" ? loc.lng : null;
  const mapsUrl = lat !== null && lng !== null
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
      : null;
  const doctorUserId = doctorId && doctor ? text(doctor, ["doctor_user_id", "user_id", "account_id"]) || doctorId : doctorId;

  return (
    <main className="main">
      <Link href={`/${locale}/appointments/${appointmentId}`}>{ar ? "الموعد" : "Appointment"}</Link>
      <h1>{locationView ? (ar ? "موقع العيادة" : "Clinic location") : (ar ? "تأكيد موعد العيادة" : "Clinic booking confirmed")}</h1>
      {!locationView ? (
        <section aria-label={ar ? "رمز الحجز" : "Booking code"}>
          <h2>{ar ? "أظهر هذا الرمز عند الاستقبال" : "Show this code at reception"}</h2>
          <p><strong>NABDAH:APPT:{bookingCode.slice(0, 8)}</strong></p>
          {when ? <p>{when}</p> : null}
        </section>
      ) : null}
      <section aria-label={ar ? "بيانات العيادة" : "Clinic details"}>
        <h2>{ar ? "بيانات العيادة" : "Clinic details"}</h2>
        <p><strong>{clinicName}</strong></p>
        {address ? <p>{address}</p> : null}
        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer">{ar ? "الاتجاهات" : "Directions"}</a> : null}
          {phone ? <a href={`tel:${phone}`}>{ar ? "اتصال" : "Call"}</a> : null}
          {doctorUserId ? <Link href={`/${locale}/consultations/chat?doctorId=${encodeURIComponent(doctorUserId)}`}>{ar ? "محادثة" : "Chat"}</Link> : null}
        </nav>
      </section>
      {!locationView ? (
        <>
          <section aria-label={ar ? "قبل موعدك" : "Before your visit"}>
            <h2>{ar ? "قبل موعدك" : "Before your visit"}</h2>
            <ul>
              <li>{ar ? "احضر قبل الموعد بـ 15 دقيقة" : "Arrive 15 minutes early"}</li>
              <li>{ar ? "أحضر الهوية وبطاقة التأمين" : "Bring your ID and insurance card"}</li>
              <li>{ar ? "أحضر تقاريرك وأدويتك الحالية" : "Bring your reports and current medications"}</li>
              <li>{ar ? "أظهر رمز الحجز عند الاستقبال" : "Show the booking code at reception"}</li>
            </ul>
          </section>
          <section aria-label={ar ? "سياسة الإلغاء والاسترداد" : "Cancellation & refund policy"}>
            <h2>{ar ? "سياسة الإلغاء والاسترداد" : "Cancellation & refund policy"}</h2>
            <ul>
              <li>{ar ? "قبل الموعد بأكثر من 24 ساعة: استرداد 100%" : "More than 24h before: 100% refund"}</li>
              <li>{ar ? "قبل 4–24 ساعة: استرداد 50%" : "4–24h before: 50% refund"}</li>
              <li>{ar ? "أقل من 4 ساعات: لا يوجد استرداد" : "Less than 4h: non-refundable"}</li>
            </ul>
            <Link href={`/${locale}/consultations/cancel-reschedule?appointmentId=${encodeURIComponent(appointmentId)}`}>
              {ar ? "إلغاء / إعادة جدولة الموعد" : "Cancel / reschedule"}
            </Link>
          </section>
        </>
      ) : null}
    </main>
  );
}
