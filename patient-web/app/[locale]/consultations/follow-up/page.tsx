import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { APPOINTMENT_ID } from "@/lib/consult/appointment-view";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string; id?: string }> };

/** Merged into the appointment page (batch 14, merge map 2 section 1): its status history and follow-up are sections there. */
export default async function ConsultationFollowUpPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  redirect(APPOINTMENT_ID.test(appointmentId) ? `/${locale}/appointments/${encodeURIComponent(appointmentId)}` : `/${locale}/appointments`);
}
