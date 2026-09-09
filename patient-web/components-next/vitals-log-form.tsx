"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { key: "bp", ar: "ضغط الدم", en: "Blood pressure", unit: "mmHg" },
  { key: "glucose", ar: "سكر الدم", en: "Blood sugar", unit: "mg/dL" },
  { key: "heart_rate", ar: "نبض القلب", en: "Heart rate", unit: "bpm" },
  { key: "weight", ar: "الوزن", en: "Weight", unit: "kg" },
  { key: "temperature", ar: "درجة الحرارة", en: "Temperature", unit: "°C" },
  { key: "spo2", ar: "أكسجين الدم", en: "Blood oxygen", unit: "%" },
] as const;

export function VitalsLogForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("bp");
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";
  const meta = TYPES.find((t) => t.key === type);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = { type, unit: meta?.unit };
    if (type === "bp") {
      const sys = Number(primary);
      const dia = Number(secondary);
      if (!Number.isFinite(sys) || !Number.isFinite(dia)) {
        setError(ar ? "أدخل قيمة القراءة المطلوبة قبل الحفظ." : "Enter the required reading before saving.");
        return;
      }
      payload.systolic = sys;
      payload.diastolic = dia;
    } else {
      const value = Number(primary);
      if (!Number.isFinite(value)) {
        setError(ar ? "أدخل قيمة القراءة المطلوبة قبل الحفظ." : "Enter the required reading before saving.");
        return;
      }
      payload.value = value;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/health/vitals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر حفظ القراءة" : "Could not save reading"));
        return;
      }
      router.push(`/${locale}/health/vitals`);
      router.refresh();
    } catch {
      setError(ar ? "تعذر حفظ القراءة" : "Could not save reading");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {TYPES.map((t) => (
          <button key={t.key} type="button" onClick={() => setType(t.key)} style={{ fontWeight: type === t.key ? 800 : 400 }}>
            {ar ? t.ar : t.en} ({t.unit})
          </button>
        ))}
      </div>
      {type === "bp" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{ar ? "الانقباضي" : "Systolic"}</span>
            <input value={primary} onChange={(e) => setPrimary(e.target.value)} inputMode="decimal" required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{ar ? "الانبساطي" : "Diastolic"}</span>
            <input value={secondary} onChange={(e) => setSecondary(e.target.value)} inputMode="decimal" required />
          </label>
        </div>
      ) : (
        <label style={{ display: "grid", gap: 6 }}>
          <span>{ar ? `القراءة (${meta?.unit})` : `Reading (${meta?.unit})`}</span>
          <input value={primary} onChange={(e) => setPrimary(e.target.value)} inputMode="decimal" required />
        </label>
      )}
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ القراءة" : "Save reading")}</button>
    </form>
  );
}
