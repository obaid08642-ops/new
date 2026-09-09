import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ id?: string; appointmentId?: string }> };

/** Parity with app waiting-room: merged into virtual-waiting-room (app maps id -> room). */
export default async function ConsultationWaitingRoomPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  redirect(
    `/${locale}/consultations/virtual-waiting-room${appointmentId ? `?appointmentId=${encodeURIComponent(appointmentId)}` : ""}`,
  );
}
