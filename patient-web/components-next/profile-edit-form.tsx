"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileEditForm({ locale, initial }: { locale: string; initial: { height_cm?: number; weight_kg?: number; blood_type?: string } }) {
  const router = useRouter();
  const [height, setHeight] = useState(initial.height_cm !== undefined ? String(initial.height_cm) : "");
  const [weight, setWeight] = useState(initial.weight_kg !== undefined ? String(initial.weight_kg) : "");
  const [blood, setBlood] = useState(initial.blood_type || "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = {};
    if (height.trim()) {
      const h = Number(height);
      if (!Number.isFinite(h) || h < 30 || h > 300) {
        setError(ar ? "تحقق من الطول والوزن قبل الحفظ." : "Verify height and weight before saving.");
        return;
      }
      payload.height_cm = h;
    }
    if (weight.trim()) {
      const w = Number(weight);
      if (!Number.isFinite(w) || w < 2 || w > 1000) {
        setError(ar ? "تحقق من الطول والوزن قبل الحفظ." : "Verify height and weight before saving.");
        return;
      }
      payload.weight_kg = w;
    }
    if (blood.trim()) payload.blood_type = blood.trim().slice(0, 8);
    if (!Object.keys(payload).length) {
      setError(ar ? "لا يوجد ما يُحفظ." : "Nothing to save.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/medical-profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر حفظ الملف الصحي." : "Could not save health file."));
        return;
      }
      router.push(`/${locale}/profile`);
      router.refresh();
    } catch {
      setError(ar ? "تعذر حفظ الملف الصحي." : "Could not save health file.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "الطول بالسنتيمتر" : "Height (cm)"}</span>
        <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" maxLength={6} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "الوزن بالكيلوغرام" : "Weight (kg)"}</span>
        <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" maxLength={6} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "فصيلة الدم" : "Blood type"}</span>
        <input value={blood} onChange={(e) => setBlood(e.target.value)} maxLength={8} placeholder="O+" dir="ltr" />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ" : "Save")}</button>
    </form>
  );
}
