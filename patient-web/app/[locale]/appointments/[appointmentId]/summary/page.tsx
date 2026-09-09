import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string; appointmentId: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function AppointmentSummaryPage({ params }: Props) {
  const { locale, appointmentId } = await params;
  if (!isLocale(locale) || !idPattern.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}/summary`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) {
    return (
      <main className="main">
        <Link href={`/${locale}/appointments/${appointmentId}`}>{ar ? "الموعد" : "Appointment"}</Link>
        <h1>{ar ? "ملخص الاستشارة" : "Consultation summary"}</h1>
        <p role="status">{ar ? "الملخص غير متاح بعد — يكتبه الطبيب بعد انتهاء الموعد." : "Summary not ready yet — the doctor writes it after the visit."}</p>
      </main>
    );
  }
  if (!response.ok) notFound();
  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const summary = ((raw as { data?: unknown })?.data ?? raw) as Record<string, unknown> | null;
  const diagnosis = typeof summary?.diagnosis === "string" ? summary.diagnosis : undefined;
  const notes = typeof summary?.notes === "string" ? summary.notes : undefined;
  const prescription = Array.isArray(summary?.prescription) ? (summary.prescription as unknown[]) : [];

  return (
    <main className="main">
      <Link href={`/${locale}/appointments/${appointmentId}`}>{ar ? "الموعد" : "Appointment"}</Link>
      <h1>{ar ? "ملخص الاستشارة" : "Consultation summary"}</h1>
      {diagnosis ? (
        <section>
          <h2>{ar ? "التشخيص" : "Diagnosis"}</h2>
          <p>{diagnosis}</p>
        </section>
      ) : null}
      {notes ? (
        <section>
          <h2>{ar ? "ملاحظات الطبيب" : "Doctor notes"}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{notes}</p>
        </section>
      ) : null}
      {prescription.length > 0 ? (
        <section>
          <h2>{ar ? "الوصفة" : "Prescription"}</h2>
          <ul>
            {prescription.map((p, i) => {
              const r = p as Record<string, unknown>;
              return <li key={i}>{String(r.name ?? r.medication ?? r.drug ?? "")} {typeof r.dose === "string" ? `— ${r.dose}` : ""}</li>;
            })}
          </ul>
          <Link href={`/${locale}/prescriptions`}>{ar ? "وصفاتي" : "My prescriptions"}</Link>
        </section>
      ) : null}
      {!diagnosis && !notes && !prescription.length ? (
        <p role="status">{ar ? "الملخص غير متاح بعد." : "Summary not available yet."}</p>
      ) : (
        <nav aria-label={ar ? "أوامر قابلة للتنفيذ" : "Actionable orders"} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {prescription.length > 0 ? (
            <Link href={`/${locale}/pharmacy`}>{ar ? "اطلب الأدوية من الصيدلية" : "Order medicines from pharmacy"}</Link>
          ) : null}
          <Link href={`/${locale}/diagnostics/labs`}>{ar ? "احجز التحاليل" : "Book tests"}</Link>
        </nav>
      )}
    </main>
  );
}
