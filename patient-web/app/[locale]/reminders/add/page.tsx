import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { MedicationReminderForm } from "@/components-next/medication-reminder-form";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ edit?: string | string[] }> };

export default async function ReminderAddPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const token = await requirePatientAccess(locale);
  const ar = locale === "ar";
  // F69: edit mode loads the existing reminder through the same list endpoint as the app.
  const editId = ((await searchParams).edit as string) || "";
  let initial = undefined;
  if (editId) {
    const { getPatientMedicationReminders } = await import("@/lib/api/reminders-server");
    const { extractMedicationReminderSummaries } = await import("@/lib/api/reminders");
    const res = await getPatientMedicationReminders(token);
    const rows = extractMedicationReminderSummaries(await res.json().catch(() => null));
    const found: any = rows.find((r: any) => r.id === editId);
    if (found) {
      initial = {
        id: found.id,
        name: found.medicineName || "",
        dose: found.dose || "",
        times: (found.times || []).join(", "),
        frequency: found.frequency || "daily",
        chronic: !!found.chronic,
      };
    }
  }

  return (
    <main className="main">
      <Link href={`/${locale}/reminders`}>{ar ? "التذكيرات" : "Reminders"}</Link>
      <h1>{ar ? "تذكير دواء جديد" : "New medication reminder"}</h1>
      <MedicationReminderForm locale={locale} initial={initial} />
    </main>
  );
}
