import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string; id: string }> };

/** Parity with app video/[id]: legacy route, the real room is video-call. */
export default async function ConsultationVideoLegacyPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/consultations/video-call?appointmentId=${encodeURIComponent(id)}`);
}
