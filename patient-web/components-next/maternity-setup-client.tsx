"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MaternitySetupClient({ locale }: { locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [mode, setMode] = useState<"cycle" | "pregnancy">("cycle");
  const [lmp, setLmp] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [regular, setRegular] = useState("true");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!lmp.trim() || (mode === "cycle" && !cycleLength.trim())) {
      setError(ar ? "أدخل التاريخ المطلوب لإكمال الملف" : "Enter the required date to complete the profile");
      return;
    }
    setSaving(true); setError(null);
    try {
      const body = mode === "pregnancy"
        ? { is_pregnant: true, lmp_date: lmp.trim(), ...(dueDate.trim() ? { due_date: dueDate.trim() } : {}) }
        : { is_pregnant: false, last_period_date: lmp.trim(), cycle_length: Number(cycleLength), is_regular: regular === "true" };
      const res = await fetch("/api/patient/maternity/profile", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-maternity-${Date.now()}` },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(ar ? "تعذر حفظ الملف" : "Could not save profile"); return; }
      router.replace(`/${locale}/maternity`);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setSaving(false); }
  }

  return (
    <div>
      {error ? <p role="alert">{error}</p> : null}
      <div style={{ display: "flex", gap: 8 }} role="radiogroup" aria-label={ar ? "المسار" : "Path"}>
        {(["cycle", "pregnancy"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}>
            {m === "cycle" ? (ar ? "تتبع الدورة" : "Cycle tracking") : (ar ? "متابعة الحمل" : "Pregnancy")}
          </button>
        ))}
      </div>
      <p>{mode === "pregnancy"
        ? (ar ? "أدخل تاريخ آخر دورة وموعد الولادة المتوقع لمتابعة حملك." : "Enter your last period and due date to track the pregnancy.")
        : (ar ? "أدخل تاريخ آخر دورة وطولها لمتابعة دورتك." : "Enter your last period date and cycle length.")}</p>
      <label>{ar ? "تاريخ آخر دورة (YYYY-MM-DD)" : "Last period date (YYYY-MM-DD)"} <input value={lmp} onChange={(e) => setLmp(e.target.value)} placeholder="2026-01-01" /></label>
      {mode === "pregnancy" ? (
        <label>{ar ? "موعد الولادة المتوقع (اختياري)" : "Due date (optional)"} <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} placeholder="2026-10-01" /></label>
      ) : (
        <>
          <label>{ar ? "طول الدورة (يوم)" : "Cycle length (days)"} <input inputMode="numeric" value={cycleLength} onChange={(e) => setCycleLength(e.target.value)} /></label>
          <div style={{ display: "flex", gap: 8 }} role="radiogroup" aria-label={ar ? "الانتظام" : "Regularity"}>
            <button type="button" role="radio" aria-checked={regular === "true"} onClick={() => setRegular("true")}>{ar ? "منتظمة" : "Regular"}</button>
            <button type="button" role="radio" aria-checked={regular === "false"} onClick={() => setRegular("false")}>{ar ? "غير منتظمة" : "Irregular"}</button>
          </div>
        </>
      )}
      <p>{ar ? "تنبيه: هذا التتبع للتوعية ولا يغني عن استشارة الطبيب، وليس وسيلة منع حمل." : "Notice: tracking is educational, not a substitute for medical advice nor contraception."}</p>
      <button type="button" onClick={save} disabled={saving}>{ar ? "حفظ الملف" : "Save profile"}</button>
    </div>
  );
}
