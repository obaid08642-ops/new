import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsTechnicianTrackingClient } from "@/components-next/diagnostics-technician-tracking-client";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bookingId?: string; id?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parity with app diagnostics/technician-tracking: live ETA polled every 15s + call button. */
export default async function DiagnosticsTechnicianTrackingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const bookingId = (sp.bookingId || sp.id || "").trim();
  if (!isLocale(locale) || !idPattern.test(bookingId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  await requirePatientAccess(locale);
  return (
    <main className="main">
      <Link href={`/${locale}/diagnostics/bookings`}>{ar ? "حجوزاتي" : "My bookings"}</Link>
      <h1>{ar ? "موقع أخصائي السحب" : "Collector location"}</h1>
      <DiagnosticsTechnicianTrackingClient bookingId={bookingId} locale={locale} />
    </main>
  );
}
