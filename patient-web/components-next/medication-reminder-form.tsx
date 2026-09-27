"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MedicationReminderForm({ locale, initial }: { locale: string; initial?: { id?: string; name?: string; dose?: string; times?: string; frequency?: string; chronic?: boolean } }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name || "");
  const [dose, setDose] = useState(initial?.dose || "");
  const [times, setTimes] = useState(initial?.times || "08:00");
  const [frequency, setFrequency] = useState(initial?.frequency || "daily");
  const [chronic, setChronic] = useState(!!initial?.chronic);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError(ar ? "أدخل اسم الدواء" : "Enter the medicine name");
      return;
    }
    setSaving(true);
    try {
      const url = initial?.id ? `/api/health/reminders/${encodeURIComponent(initial.id)}` : "/api/health/reminders";
      const res = await fetch(url, {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          medicine_name_ar: name.trim(),
          dose: dose.trim(),
          times: times.split(",").map((t) => t.trim()).filter(Boolean),
          frequency,
          chronic,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر حفظ التذكير" : "Could not save reminder"));
        return;
      }
      router.push(`/${locale}/reminders`);
      router.refresh();
    } catch {
      setError(ar ? "تعذر حفظ التذكير" : "Could not save reminder");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "اسم الدواء" : "Medicine name"}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "الجرعة" : "Dose"}</span>
        <input value={dose} onChange={(e) => setDose(e.target.value)} maxLength={128} placeholder={ar ? "مثال: قرص واحد" : "e.g. one tablet"} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "الأوقات (افصل بفاصلة)" : "Times (comma separated)"}</span>
        <input value={times} onChange={(e) => setTimes(e.target.value)} maxLength={128} placeholder="08:00, 20:00" dir="ltr" />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "التكرار" : "Frequency"}</span>
        <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
          <option value="daily">{ar ? "يومي" : "Daily"}</option>
          <option value="weekly">{ar ? "أسبوعي" : "Weekly"}</option>
          <option value="as_needed">{ar ? "عند الحاجة" : "As needed"}</option>
        </select>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={chronic} onChange={(e) => setChronic(e.target.checked)} />
        <span>{ar ? "دواء مزمن" : "Chronic medicine"}</span>
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ الحفظ..." : "Saving...") : (ar ? "حفظ التذكير" : "Save reminder")}</button>
    </form>
  );
}
