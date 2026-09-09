import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bookingId?: string; domain?: string }> };

export default async function DiagnosticsBookingSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const bookingId = (sp.bookingId || "").trim();
  const domain = sp.domain === "radiology" ? "radiology" : "labs";
  if (!isLocale(locale) || !bookingId) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/${domain}/bookings/${encodeURIComponent(bookingId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) notFound();

  return (
    <main className="main">
      <h1>{ar ? "تم الحجز بنجاح" : "Booking confirmed"}</h1>
      <p>{ar ? "حجزك مسجل. تابع حالته من حجوزاتك." : "Your booking is registered. Track it from your bookings."}</p>
      <nav style={{ display: "flex", gap: 8 }}>
        <Link href={`/${locale}/diagnostics/${domain}/${encodeURIComponent(bookingId)}`}>
          {ar ? "تفاصيل الحجز" : "Booking details"}
        </Link>
        <Link href={`/${locale}/diagnostics/bookings`}>{ar ? "حجوزاتي" : "My bookings"}</Link>
      </nav>
    </main>
  );
}
