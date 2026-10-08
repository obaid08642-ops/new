import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Decision 24 (batch 14): no free doctor chat; the thread opens from a booking (/appointments/[id]/chat). The bookings list is where it starts. */
export default async function ConsultationChatPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/appointments`);
}
