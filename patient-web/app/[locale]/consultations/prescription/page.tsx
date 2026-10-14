import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { APPOINTMENT_ID } from "@/lib/consult/appointment-view";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

/** Merged into the appointment page (batch 14, merge map 2 section 1): the prescription is a section there. Without an appointment: the bookings list. */
export default async function PrescriptionPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || "").trim();
  redirect(APPOINTMENT_ID.test(appointmentId) ? `/${locale}/appointments/${encodeURIComponent(appointmentId)}` : `/${locale}/appointments`);
}
