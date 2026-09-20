import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientMedicationReminders } from "@/lib/api/reminders-server";
import { extractMedicationReminderSummaries } from "@/lib/api/reminders";
import { VectorPharmacy } from "@/components-next/vector-illustrations";
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
    <main className="main" style={{ background: "#FDFDFC", display: "grid", gap: 16 } as any}>
      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: 24,
          border: "1px solid #E8EDEE",
          borderRadius: 20,
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        } as any}
      >
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          <Link
            href={`/${locale}/health/medications`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 20,
              border: "1px solid #E8EDEE",
              background: "#5FD9B3",
              color: "#1E332E",
              fontWeight: 700,
              textDecoration: "none",
              width: "fit-content",
              overflowWrap: "anywhere",
            } as any}
          >
            {ar ? "أدويتي" : "My medications"}
          </Link>
          <h1
            style={{
              color: "#1E332E",
              overflowWrap: "anywhere",
              display: "-webkit-box",
              WebkitLineClamp: 2 as any,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            } as any}
          >
            {ar ? "إعادة صرف الأدوية" : "Medication refills"}
          </h1>
        </div>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "rgba(95,217,179,.12)",
            border: "1px solid #E8EDEE",
            flex: "0 0 auto",
          } as any}
        >
          <VectorPharmacy size={48} aria-hidden="true" />
        </span>
      </section>
      {reminders.length === 0 ? (
        <section
          style={{
            display: "grid",
            placeItems: "center",
            gap: 16,
            padding: 24,
            border: "1px solid #E8EDEE",
            borderRadius: 20,
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            textAlign: "center",
          } as any}
        >
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "rgba(95,217,179,.12)",
              border: "1px solid #E8EDEE",
            } as any}
          >
            <VectorPharmacy size={48} aria-hidden="true" />
          </span>
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{ar ? "لا توجد أدوية لطلب إعادة صرفها." : "No medications to refill."}</p>
        </section>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 } as any}>
          {reminders.map((r) => (
            <li
              key={r.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "center",
                padding: 16,
                border: "1px solid #E8EDEE",
                borderRadius: 20,
                background: "rgba(255,255,255,.82)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              } as any}
            >
              <span
                style={{
                  color: "#1E332E",
                  overflowWrap: "anywhere",
                  display: "-webkit-box",
                  WebkitLineClamp: 2 as any,
                  WebkitBoxOrient: "vertical" as any,
                  overflow: "hidden",
                } as any}
              >
                <strong>{r.medicineName || (ar ? "دواء" : "Medicine")}</strong>
                {r.dose ? ` — ${r.dose}` : ""}
              </span>
              <RefillButton reminderId={r.id} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
