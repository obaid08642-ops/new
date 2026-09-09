"use client";

import { useState } from "react";

const AREAS = ["face", "scalp", "hands", "body"];
const OBSERVATIONS = ["redness", "itching", "dryness", "rash", "swelling", "none"];

export function SkinAnalysisForm({ locale }: { locale: string }) {
  const [areas, setAreas] = useState<string[]>([]);
  const [observations, setObservations] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [acked, setAcked] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!areas.length) {
      setError(ar ? "اختر منطقة واحدة على الأقل" : "Select at least one area");
      return;
    }
    if (!acked) {
      setError(ar ? "أقر بأن هذه نتيجة استرشادية لا تغني عن الطبيب" : "Acknowledge this is advisory only");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ai/skin-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          acknowledge_limitations: true,
          areas,
          observations: observations.length ? observations : ["none"],
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر التحليل" : "Analysis failed"));
        return;
      }
      setResult(data);
    } catch {
      setError(ar ? "تعذر التحليل" : "Analysis failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <fieldset>
        <legend>{ar ? "المنطقة" : "Area"}</legend>
        {AREAS.map((a) => (
          <label key={a} style={{ display: "flex", gap: 8 }}>
            <input type="checkbox" checked={areas.includes(a)} onChange={() => toggle(areas, a, setAreas)} />
            <span>{a}</span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{ar ? "الملاحظات" : "Observations"}</legend>
        {OBSERVATIONS.map((o) => (
          <label key={o} style={{ display: "flex", gap: 8 }}>
            <input type="checkbox" checked={observations.includes(o)} onChange={() => toggle(observations, o, setObservations)} />
            <span>{o}</span>
          </label>
        ))}
      </fieldset>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "ملاحظة (اختياري)" : "Note (optional)"}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} />
      </label>
      <label style={{ display: "flex", gap: 8 }}>
        <input type="checkbox" checked={acked} onChange={(e) => setAcked(e.target.checked)} />
        <span>{ar ? "أقر بأن النتيجة استرشادية ولا تغني عن تشخيص الطبيب" : "I acknowledge this is advisory and not a diagnosis"}</span>
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ التحليل..." : "Analyzing...") : (ar ? "تحليل" : "Analyze")}</button>
      {result ? <pre dir="ltr" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre> : null}
    </form>
  );
}
