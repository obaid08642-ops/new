import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string; id?: string }> };

/** Parity with app booking-pending: deprecated in-app, merged into booking-status. */
export default async function ConsultationBookingPendingPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  redirect(`/${locale}/consultations/booking-status${appointmentId ? `?appointmentId=${encodeURIComponent(appointmentId)}` : ""}`);
}
