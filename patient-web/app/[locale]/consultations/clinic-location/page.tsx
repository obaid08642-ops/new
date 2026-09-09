import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string }> };

/** Parity with app clinic-location: unified into clinic-confirm?view=location. */
export default async function ConsultationClinicLocationPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || "").trim();
  redirect(
    `/${locale}/consultations/clinic-confirm?view=location${appointmentId ? `&appointmentId=${encodeURIComponent(appointmentId)}` : ""}`,
  );
}
