"use client";

import { useState } from "react";

type Hit = { severity?: string; note_ar?: string; note?: string };

export function DrugInteractionChecker({ locale }: { locale: string }) {
  const [input, setInput] = useState("");
  const [drugs, setDrugs] = useState<string[]>([]);
  const [result, setResult] = useState<{ checked?: number; safe?: boolean; interactions?: Hit[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const ar = locale === "ar";

  function addDrug() {
    const name = input.trim();
    if (name.length < 2 || drugs.length >= 20) return;
    if (!drugs.some((d) => d.toLowerCase() === name.toLowerCase())) {
      setDrugs([...drugs, name]);
    }
    setInput("");
  }

  async function check() {
    setError(null);
    setResult(null);
    if (!drugs.length) {
      setError(ar ? "أضف دواءً واحداً على الأقل" : "Add at least one drug");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/ai/drug-interactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ drugs }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر الفحص" : "Check failed"));
        return;
      }
      setResult(data as { checked?: number; safe?: boolean; interactions?: Hit[] });
    } catch {
      setError(ar ? "تعذر الفحص" : "Check failed");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDrug(); } }}
          placeholder={ar ? "اسم الدواء" : "Drug name"}
          maxLength={200}
        />
        <button type="button" onClick={addDrug}>{ar ? "إضافة" : "Add"}</button>
      </div>
      {drugs.length > 0 ? (
        <ul style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0 }}>
          {drugs.map((d) => (
            <li key={d}>
              {d}{" "}
              <button type="button" onClick={() => setDrugs(drugs.filter((x) => x !== d))} aria-label={ar ? `إزالة ${d}` : `Remove ${d}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" onClick={check} disabled={checking || !drugs.length}>
        {checking ? (ar ? "جارٍ الفحص..." : "Checking...") : (ar ? "فحص التفاعلات" : "Check interactions")}
      </button>
      {error ? <p role="alert">{error}</p> : null}
      {result ? (
        <section aria-live="polite">
          <p><strong>{result.safe ? (ar ? "لا توجد تفاعلات عالية الخطورة" : "No high-severity interactions") : (ar ? "توجد تفاعلات تحتاج انتباه" : "Interactions need attention")}</strong></p>
          {(result.interactions || []).map((h, i) => (
            <p key={i}>[{h.severity || "?"}] {h.note_ar || h.note || ""}</p>
          ))}
        </section>
      ) : null}
      <p><small>{ar ? "نتيجة استرشادية لا تغني عن استشارة الصيدلي." : "Advisory result; consult your pharmacist."}</small></p>
    </div>
  );
}
