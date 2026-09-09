import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { MedicationReminderForm } from "@/components-next/medication-reminder-form";

type Props = { params: Promise<{ locale: string }> };

export default async function ReminderAddPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requirePatientAccess(locale);
  const ar = locale === "ar";

  return (
    <main className="main">
      <Link href={`/${locale}/reminders`}>{ar ? "التذكيرات" : "Reminders"}</Link>
      <h1>{ar ? "تذكير دواء جديد" : "New medication reminder"}</h1>
      <MedicationReminderForm locale={locale} />
    </main>
  );
}
