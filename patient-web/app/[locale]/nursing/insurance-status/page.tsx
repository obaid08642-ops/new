import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bookingId?: string; id?: string }> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Parity with app nursing/insurance-status: owned booking (or latest insurance one) + decision + copay. */
export default async function NursingInsuranceStatusPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const sp = await searchParams;
  const bookingId = (sp.bookingId || sp.id || "").trim();

  let booking: Record<string, unknown> | null = null;
  if (bookingId) {
    const res = await callPatientApi(`/home-care/bookings/${encodeURIComponent(bookingId)}`, {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (res.ok) {
      const payload = asRecord(await res.json().catch(() => null));
      booking = asRecord(payload?.data) ?? payload;
    }
  }
  if (!booking?.id) {
    const res = await callPatientApi("/home-care/bookings/my?limit=5", {}, token);
    if (res.status === 401) redirect(`/${locale}/login`);
    if (res.ok) {
      const payload = asRecord(await res.json().catch(() => null));
      const list = [payload?.data, payload?.bookings, payload?.items].find(Array.isArray);
      const arr = (Array.isArray(list) ? list : []).map(asRecord).filter((r): r is Record<string, unknown> => !!r?.id);
      booking = arr.find((b) => b.payment_method === "insurance") ?? arr[0] ?? null;
    }
  }
  if (!booking?.id) notFound();

  const state = typeof booking.state === "string" ? booking.state : typeof booking.status === "string" ? booking.status : "";
  const decision = typeof booking.decision === "string" ? booking.decision : null;
  const copayRaw = booking.copay_amount ?? booking.patient_share;
  const copay = typeof copayRaw === "number" ? copayRaw : Number(copayRaw);
  const liveOk = ["CONFIRMED", "IN_PROGRESS", "APPROVED_FULL"].includes(state) && typeof booking.id === "string";
  return (
    <main className="main">
      <Link href={`/${locale}/nursing/visits`}>{ar ? "زياراتي" : "My visits"}</Link>
      <h1>{ar ? "حالة موافقة التأمين" : "Insurance approval status"}</h1>
      <section aria-label={ar ? "القرار" : "Decision"}>
        <p role="status">{state || (ar ? "غير معروف" : "Unknown")}</p>
        {decision ? <p>{ar ? "القرار:" : "Decision:"} {decision}</p> : null}
        {Number.isFinite(copay) && copay > 0 ? <p>{ar ? "التحمل:" : "Co-pay:"} {copay.toFixed(2)} {ar ? "ر.س" : "SAR"}</p> : null}
        <p>{ar ? "ستصلك إشعارات عند تغيّر القرار، وتابع الزيارة لحظياً بعد التأكيد." : "You will be notified on decision changes; track the visit live after confirmation."}</p>
      </section>
      {liveOk ? (
        <Link href={`/${locale}/nursing/visits/${encodeURIComponent(booking.id as string)}`}>{ar ? "فتح التتبع الحي" : "Open live tracking"}</Link>
      ) : null}
    </main>
  );
}
