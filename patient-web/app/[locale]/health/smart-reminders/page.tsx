import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

/** Parity with app health/smart-reminders: canonical list is medication reminders. */
export default async function HealthSmartRemindersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  redirect(`/${locale}/reminders`);
}
