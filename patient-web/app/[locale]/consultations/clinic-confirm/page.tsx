import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string; id?: string; view?: string }> };

/** Merged into booking-status (batch 14, merge map 2 section 1): the clinic confirmation is the confirmed state of the same booking. The query is kept. */
export default async function ConsultationClinicConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  const query = new URLSearchParams();
  if (appointmentId) query.set("appointmentId", appointmentId);
  if (sp.view) query.set("view", sp.view);
  const qs = query.toString();
  redirect(`/${locale}/consultations/booking-status${qs ? `?${qs}` : ""}`);
}
