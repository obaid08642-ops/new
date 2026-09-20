import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { getPatientMedicationReminders } from "@/lib/api/reminders-server";
import { extractMedicationReminderSummaries } from "@/lib/api/reminders";
import { VectorPharmacy } from "@/components-next/vector-illustrations";

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
            {ar ? "أدويتي" : "My medications"}
          </h1>
          <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href={`/${locale}/reminders`}
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
                overflowWrap: "anywhere",
              } as any}
            >
              {ar ? "التذكيرات" : "Reminders"}
            </Link>
            <Link
              href={`/${locale}/reminders/add`}
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
                overflowWrap: "anywhere",
              } as any}
            >
              {ar ? "تذكير جديد" : "New reminder"}
            </Link>
            <Link
              href={`/${locale}/health/refills`}
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
                overflowWrap: "anywhere",
              } as any}
            >
              {ar ? "إعادة الصرف" : "Refills"}
            </Link>
          </nav>
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
      <Link
        href={`/${locale}/health`}
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
        {ar ? "صحتي" : "My health"}
      </Link>
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
          <p style={{ color: "#6B7C6E", overflowWrap: "anywhere" } as any}>{ar ? "لا توجد أدوية مسجلة." : "No medications recorded."}</p>
        </section>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 } as any}>
          {reminders.map((r) => (
            <li
              key={r.id}
              style={{
                display: "grid",
                gap: 8,
                padding: 16,
                border: "1px solid #E8EDEE",
                borderRadius: 20,
                background: "rgba(255,255,255,.82)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                overflowWrap: "anywhere",
              } as any}
            >
              <strong
                style={{
                  color: "#1E332E",
                  overflowWrap: "anywhere",
                  display: "-webkit-box",
                  WebkitLineClamp: 2 as any,
                  WebkitBoxOrient: "vertical" as any,
                  overflow: "hidden",
                } as any}
              >
                {r.medicineName || (ar ? "دواء" : "Medicine")}
              </strong>
              <span style={{ color: "#6B7C6E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2 as any, WebkitBoxOrient: "vertical" as any, overflow: "hidden" } as any}>
                {r.dose ? ` — ${r.dose}` : null}
                {r.times.length ? ` · ${r.times.join(", ")}` : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
