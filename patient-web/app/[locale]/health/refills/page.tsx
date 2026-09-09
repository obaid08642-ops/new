import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientMedicationReminders } from "@/lib/api/reminders-server";
import { extractMedicationReminderSummaries } from "@/lib/api/reminders";
import { RefillButton } from "@/components-next/refill-button";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthRefillsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await getPatientMedicationReminders(token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  const reminders = response.ok ? extractMedicationReminderSummaries(await response.json().catch(() => null)) : [];

  return (
    <main className="main">
      <Link href={`/${locale}/health/medications`}>{ar ? "أدويتي" : "My medications"}</Link>
      <h1>{ar ? "إعادة صرف الأدوية" : "Medication refills"}</h1>
      {reminders.length === 0 ? (
        <p>{ar ? "لا توجد أدوية لطلب إعادة صرفها." : "No medications to refill."}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {reminders.map((r) => (
            <li key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <span><strong>{r.medicineName || (ar ? "دواء" : "Medicine")}</strong>{r.dose ? ` — ${r.dose}` : ""}</span>
              <RefillButton reminderId={r.id} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
