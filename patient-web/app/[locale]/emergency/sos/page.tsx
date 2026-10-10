import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Removed by owner decision 14 (2026-10-10): no in-app SOS, ambulance or tracking. The old route opens the urgent-help page. */
export default async function RemovedEmergencyRoute({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/emergency`);
}
