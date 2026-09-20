import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { DiagnosticsTechnicianTrackingClient } from "@/components-next/diagnostics-technician-tracking-client";
import { VectorLabs } from "@/components-next/vector-illustrations";

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
    <main className="main" style={{ background: "#FDFDFC", gap: 16, padding: "16px 0" } as any}>
      <Link href={`/${locale}/diagnostics/bookings`} style={{ color: "#1E332E", overflowWrap: "anywhere" } as any}>{ar ? "حجوزاتي" : "My bookings"}</Link>
      <section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "موقع أخصائي السحب" : "Collector location"}</h1>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorLabs size={48} aria-hidden="true" /></span>
      </section>
      <section style={{ display: "grid", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <DiagnosticsTechnicianTrackingClient bookingId={bookingId} locale={locale} />
      </section>
    </main>
  );
}
