import Link from "next/link";
import { VectorDoctor } from "@/components-next/vector-illustrations";
import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requirePatientAccess } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n";
import { callPatientApi } from "@/lib/api/upstream";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ appointmentId?: string; id?: string }> };
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}
function text(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

/** Parity with app follow-up: real appointment + doctor + prescriptions + state history + actions. */
export default async function ConsultationFollowUpPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const appointmentId = (sp.appointmentId || sp.id || "").trim();
  if (!isLocale(locale) || !idPattern.test(appointmentId)) notFound();
  setRequestLocale(locale);
  const ar = locale === "ar";
  const token = await requirePatientAccess(locale);
  const response = await callPatientApi(`/care/appointments/${encodeURIComponent(appointmentId)}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) notFound();
  const raw = asRecord(await response.json().catch(() => null));
  const appt = asRecord(raw?.data) ?? raw;
  if (!appt?.id) notFound();

  const status = text(appt, ["status"]) ?? "";
  const isCompleted = status === "COMPLETED";
  const doctorId = text(appt, ["doctor_id", "doctorId"]);
  const doctorName = text(appt, ["doctor_name", "doctorName"]) ?? (ar ? "الطبيب المعالج" : "Treating doctor");
  const slotStart = text(appt, ["slot_start", "slotStart"]);
  const when = slotStart && Number.isFinite(Date.parse(slotStart))
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(slotStart))
    : null;
  const serviceType = text(appt, ["service_type", "serviceType"]);
  const visitLabel = serviceType === "video"
    ? (ar ? "استشارة فيديو عن بعد" : "Video consultation")
    : serviceType === "home"
      ? (ar ? "زيارة منزلية" : "Home visit")
      : (ar ? "كشف في العيادة" : "Clinic visit");
  const patientNotes = text(appt, ["patient_notes", "patientNotes"]);
  const prescriptionsRaw = Array.isArray(appt.prescriptions) ? appt.prescriptions : [];
  const prescriptions: string[] = prescriptionsRaw
    .map((p) => (typeof p === "string" ? p : text(asRecord(p) ?? {}, ["name"])))
    .filter((p): p is string => !!p);
  const historyRaw = Array.isArray(appt.state_history) ? appt.state_history : [];
  const history = historyRaw.flatMap((h) => {
    const r = asRecord(h);
    if (!r) return [];
    return [{ state: text(r, ["state"]) ?? "", at: text(r, ["at"]) ?? "", note: text(r, ["note"]) ?? "" }];
  }).reverse();

  return (
    <main className="main" style={{ background: "#FDFDFC", gap: 16, padding: "16px 0" } as any}>
      <Link href={`/${locale}/appointments/${appointmentId}`} style={{ color: "#1E332E", overflowWrap: "anywhere" } as any}>{ar ? "الموعد" : "Appointment"}</Link>
      <section style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <div style={{ display: "grid", gap: 8, minWidth: 0, flex: 1 } as any}>
          <h1 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "متابعة الاستشارة" : "Consultation follow-up"}</h1>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: "#1E332E" } as any}><strong style={{ overflowWrap: "anywhere" } as any}>{doctorName}</strong>{when ? ` — ${when}` : ""}</p>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "الحالة:" : "Status:"} {status || (ar ? "غير متاحة" : "Unavailable")}</p>
        </div>
        <span style={{ display: "grid", placeItems: "center", width: 48, height: 48, borderRadius: 16, background: "rgba(95,217,179,.12)", border: "1px solid #E8EDEE", flex: "0 0 auto" } as any}><VectorDoctor size={48} aria-hidden="true" /></span>
      </section>
      <section aria-label={ar ? "نوع الزيارة" : "Visit type"} style={{ display: "grid", gap: 8, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "نوع الزيارة" : "Visit type"}</h2>
        <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{visitLabel}</p>
      </section>
      {patientNotes ? (
        <section aria-label={ar ? "ملاحظاتك للطبيب" : "Your notes for the doctor"} style={{ display: "grid", gap: 8, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
          <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "ملاحظاتك للطبيب" : "Your notes for the doctor"}</h2>
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{patientNotes}</p>
        </section>
      ) : null}
      <section aria-label={ar ? "الأدوية الموصوفة" : "Prescribed medications"} style={{ display: "grid", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "الأدوية الموصوفة" : "Prescribed medications"}</h2>
        {prescriptions.length === 0 ? (
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{isCompleted ? (ar ? "لم يصف الطبيب أدوية في هذه الاستشارة" : "No medications prescribed in this visit") : (ar ? "تظهر الأدوية هنا بعد اكتمال الاستشارة" : "Medications appear here after the visit completes")}</p>
        ) : (
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" } as any}>{prescriptions.map((name) => <li key={name} style={{ padding: "8px 12px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.72)", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{name}</li>)}</ul>
        )}
        {prescriptions.length > 0 ? (
          <Link href={`/${locale}/pharmacy`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, overflowWrap: "anywhere" } as any}>{ar ? "طلب صرف من الصيدلية" : "Order from pharmacy"}</Link>
        ) : null}
      </section>
      <section aria-label={ar ? "سجل الحالة" : "Status history"} style={{ display: "grid", gap: 16, padding: 24, borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } as any}>
        <h2 style={{ color: "#1E332E", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "سجل الحالة" : "Status history"}</h2>
        {history.length === 0 ? (
          <p style={{ overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>{ar ? "لا يوجد سجل بعد" : "No history yet"}</p>
        ) : (
          <ul style={{ display: "grid", gap: 8, margin: 0, padding: 0, listStyle: "none" } as any}>
            {history.map((h, i) => (
              <li key={`${h.state}-${i}`} style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "8px 12px", borderRadius: 20, border: "1px solid #E8EDEE", background: "rgba(255,255,255,.72)", overflowWrap: "anywhere" } as any}>
                <strong style={{ color: "#1E332E", overflowWrap: "anywhere" } as any}>{h.state}</strong>
                <span style={{ overflowWrap: "anywhere" } as any}>{h.at ? ` — ${h.at}` : ""}{h.note ? ` — ${h.note}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" } as any} aria-label={ar ? "إجراءات" : "Actions"}>
        {doctorId ? <Link href={`/${locale}/consultations/chat?doctorId=${encodeURIComponent(doctorId)}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, overflowWrap: "anywhere" } as any}>{ar ? "محادثة الطبيب" : "Chat with doctor"}</Link> : null}
        {doctorId ? <Link href={`/${locale}/consultations/book/${encodeURIComponent(doctorId)}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 20, border: "1px solid #E8EDEE", background: "#5FD9B3", color: "#1E332E", fontWeight: 760, overflowWrap: "anywhere" } as any}>{ar ? "حجز موعد متابعة" : "Book follow-up"}</Link> : null}
      </nav>
    </main>
  );
}
