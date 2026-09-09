import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientMedicationReminders } from "@/lib/api/reminders-server";
import { extractMedicationReminderSummaries } from "@/lib/api/reminders";

type Props = { params: Promise<{ locale: string }> };

export default async function HealthMedicationsPage({ params }: Props) {
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
      <Link href={`/${locale}/health`}>{ar ? "صحتي" : "My health"}</Link>
      <h1>{ar ? "أدويتي" : "My medications"}</h1>
      <nav style={{ display: "flex", gap: 8 }}>
        <Link href={`/${locale}/reminders`}>{ar ? "التذكيرات" : "Reminders"}</Link>
        <Link href={`/${locale}/reminders/add`}>{ar ? "تذكير جديد" : "New reminder"}</Link>
        <Link href={`/${locale}/health/refills`}>{ar ? "إعادة الصرف" : "Refills"}</Link>
      </nav>
      {reminders.length === 0 ? (
        <p>{ar ? "لا توجد أدوية مسجلة." : "No medications recorded."}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {reminders.map((r) => (
            <li key={r.id}>
              <strong>{r.medicineName || (ar ? "دواء" : "Medicine")}</strong>
              {r.dose ? <span> — {r.dose}</span> : null}
              {r.times.length ? <span> · {r.times.join(", ")}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
