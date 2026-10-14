import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

/** The location view of booking-status (batch 14): the query is kept. */
export default async function ConsultationClinicLocationPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || "").trim();
  redirect(`/${locale}/consultations/booking-status?view=location${appointmentId ? `&appointmentId=${encodeURIComponent(appointmentId)}` : ""}`);
}
