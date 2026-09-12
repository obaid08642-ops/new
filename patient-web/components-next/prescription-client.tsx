"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Med = { id?: string; name?: string; name_ar?: string; dose?: string; dosage?: string; freq?: string; frequency?: string; duration?: string; instruction?: string };

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Parity with app prescription-from-doctor: match by appointment, add reminders, order from pharmacy. */
export function PrescriptionClient({ locale, appointmentId }: { locale: string; appointmentId?: string }) {
  const ar = locale === "ar";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rx, setRx] = useState<any | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/patient/prescriptions/active", { cache: "no-store", credentials: "same-origin" });
      const data = await res.json().catch(() => null);
      const list: any[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const match = appointmentId
        ? list.find((p: any) => String(p.appointment_id || p.appointmentId || "") === String(appointmentId)) || null
        : list[0] || null;
      setRx(match);
    } catch {
      setError(ar ? "تعذر تحميل الوصفة" : "Could not load prescription");
    } finally {
      setLoading(false);
    }
  }, [appointmentId, ar]);

  useEffect(() => { void load(); }, [load]);

  async function addReminder(med: Med) {
    if (busy) return;
    const key = String(med.id || med.name || med.name_ar || "");
    if (!key || added.includes(key)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/patient/health/reminders", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        credentials: "same-origin",
        body: JSON.stringify({
          medication_name: med.name || med.name_ar || (ar ? "دواء" : "Medicine"),
          dosage: med.dosage || med.dose || "",
          frequency: med.frequency || med.freq || "daily",
          prescription_id: rx?.id,
        }),
      });
      if (!res.ok) throw new Error(ar ? "تعذر إضافة التذكير" : "Reminder failed");
      setAdded((p) => [...p, key]);
    } catch (e: any) {
      setError(String(e?.message || "reminder_failed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>{ar ? "جارٍ التحميل…" : "Loading…"}</p>;
  if (error) return (
    <div>
      <p role="alert">{error}</p>
      <button type="button" onClick={() => void load()}>{ar ? "إعادة المحاولة" : "Retry"}</button>
    </div>
  );
  if (!rx) return <p>{ar ? "لا توجد وصفة مطابقة." : "No matching prescription."}</p>;

  const meds: Med[] = Array.isArray(rx.medications) ? rx.medications : [];
  return (
    <div>
      <h2>{rx.title_ar || rx.title_en || (ar ? "وصفة طبية" : "Prescription")}</h2>
      {rx.doctor_name ? <p>{rx.doctor_name}</p> : null}
      {rx.diagnosis ? <p>{ar ? `التشخيص: ${rx.diagnosis}` : `Diagnosis: ${rx.diagnosis}`}</p> : null}
      <ul>
        {meds.map((m, i) => {
          const key = String(m.id || m.name || m.name_ar || i);
          const done = added.includes(key);
          return (
            <li key={key}>
              <div>
                <strong>{m.name || m.name_ar}</strong>
                <span> {(m.dosage || m.dose || "")} {(m.frequency || m.freq || "")} {(m.duration || "")}</span>
              </div>
              <button type="button" disabled={busy || done} onClick={() => void addReminder(m)}>
                {done ? (ar ? "✓ في التذكيرات" : "✓ In reminders") : (ar ? "أضف للتذكير" : "Add reminder")}
              </button>
            </li>
          );
        })}
      </ul>
      {rx.id ? (
        <Link href={`/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(rx.id)}`}>
          {ar ? "اطلب من الصيدلية" : "Order from pharmacy"}
        </Link>
      ) : null}
    </div>
  );
}
