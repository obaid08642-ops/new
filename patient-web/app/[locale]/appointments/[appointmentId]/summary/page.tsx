import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";
import { APPOINTMENT_ID } from "@/lib/consult/appointment-view";

type Props = { params: Promise<{ locale: string; appointmentId: string }> };

/** Merged into the appointment page (batch 14, merge map 2 section 1): the summary is a section there. */
export default async function AppointmentSummaryPage({ params }: Props) {
  const { locale, appointmentId } = await params;
  if (!isLocale(locale) || !APPOINTMENT_ID.test(appointmentId)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/appointments/${encodeURIComponent(appointmentId)}`);
}
