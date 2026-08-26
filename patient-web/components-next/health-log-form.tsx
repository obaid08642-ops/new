"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Field = { name: string; label: string; type: "number" | "text"; min?: number; max?: number; step?: number; required?: boolean };

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/**
 * Health logging forms (parity #16): real POSTs through the BFF —
 * physiological validation happens upstream, results render after refresh.
 */
export function HealthLogForm({
  endpoint,
  kind,
}: {
  endpoint: "/api/health/vitals" | "/api/health/sleep" | "/api/mental-health/mood";
  kind: "vitals" | "sleep" | "mood";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [vitalType, setVitalType] = useState("bp");

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (busy) return;
    const form = new FormData(formEvent.currentTarget);
    const payload: Record<string, unknown> = {};
    for (const [name, value] of form.entries()) {
      if (typeof value !== "string" || value.trim() === "" ) continue;
      payload[name] = value;
    }
    if (kind === "vitals") {
      delete payload.type;
      payload.type = vitalType;
    }
    setBusy(true); setError(null); setDone(false);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر التسجيل");
        return;
      }
      setDone(true);
      formEvent.currentTarget.reset();
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  const fieldsFor = (): { rows: Field[]; extra?: React.ReactNode } => {
    if (kind === "sleep") {
      return { rows: [
        { name: "sleep_score", label: "درجة النوم (0-100)", type: "number", min: 0, max: 100, required: true },
        { name: "duration_hours", label: "مدة النوم بالساعات (0-24)", type: "number", min: 0, max: 24, step: 0.5, required: true },
      ] };
    }
    if (kind === "mood") {
      return { rows: [
        { name: "energy_level", label: "مستوى الطاقة (1-5) اختياري", type: "number", min: 1, max: 5 },
        { name: "stress_level", label: "مستوى التوتر (1-5) اختياري", type: "number", min: 1, max: 5 },
        { name: "sleep_hours", label: "ساعات النوم (0-24) اختياري", type: "number", min: 0, max: 24, step: 0.5 },
      ] };
    }
    return { rows: [
      ...(vitalType === "bp"
        ? [
            { name: "systolic", label: "الانقباض (60-260)", type: "number" as const, min: 60, max: 260, required: true },
            { name: "diastolic", label: "الانبساط (30-160)", type: "number" as const, min: 30, max: 160, required: true },
          ]
        : [{ name: "value", label: "القيمة", type: "number" as const, required: true }]),
      { name: "measured_at", label: "التاريخ (اختياري)", type: "text" },
    ] };
  };

  const { rows } = fieldsFor();

  return (
    <form onSubmit={submit} style={{ marginTop: "1rem", display: "grid", gap: ".7rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: "1rem" }} aria-label="تسجيل قراءة">
      <strong>{kind === "vitals" ? "تسجيل قراءة حيوية" : kind === "sleep" ? "تسجيل نوم" : "كيف حالك اليوم؟"}</strong>
      {kind === "mood" && (
        <fieldset style={{ border: "none", padding: 0, display: "flex", gap: ".8rem", flexWrap: "wrap", fontSize: ".88rem" }}>
          <legend style={{ marginBottom: ".3rem" }}>المزاج</legend>
          {[["great", "رائع"], ["good", "جيد"], ["okay", "لا بأس"], ["bad", "سيئ"], ["terrible", "مزعج"]].map(([value, label]) => (
            <label key={value}>
              <input type="radio" name="mood" value={value} required defaultChecked={value === "good"} /> {label}
            </label>
          ))}
        </fieldset>
      )}
      {kind === "vitals" && (
        <label style={{ display: "grid", gap: ".3rem", fontSize: ".85rem" }}>
          نوع القياس
          <select value={vitalType} onChange={(event) => setVitalType(event.target.value)} style={fieldStyle}>
            <option value="bp">ضغط الدم</option>
            <option value="glucose">سكر</option>
            <option value="heart_rate">نبض</option>
            <option value="weight">وزن</option>
            <option value="temperature">حرارة</option>
            <option value="spo2">تشبع أكسجين</option>
          </select>
        </label>
      )}
      {rows.map((field) => (
        <label key={field.name} style={{ display: "grid", gap: ".3rem", fontSize: ".85rem" }}>
          {field.label}
          <input name={field.name} type={field.type} min={field.min} max={field.max} step={field.step} required={field.required} style={fieldStyle} />
        </label>
      ))}
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
      {done ? <p role="status" style={{ margin: 0, fontSize: ".82rem", color: "#0b7a53" }}>تم التسجيل</p> : null}
      <button type="submit" disabled={busy} style={{ justifySelf: "start", border: "none", cursor: busy ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".6rem 1.2rem" }}>
        {busy ? "جارٍ التسجيل..." : "تسجيل"}
      </button>
    </form>
  );
}
