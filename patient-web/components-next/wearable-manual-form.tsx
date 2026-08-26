"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/** Manual wearable sample (parity #32): real ingest via BFF, source=manual upstream. */
export function WearableManualForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (busy) return;
    const form = new FormData(formEvent.currentTarget);
    setBusy(true); setError(null); setDone(false);
    try {
      const res = await fetch("/api/wearables", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          metric: String(form.get("metric") || ""),
          value: Number(form.get("value")),
        }),
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

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: ".5rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: "1rem" }} aria-label="إدخال قياس يدوي">
      <strong>إدخال قياس يدوي</strong>
      <div className="grid grid-cols-2 gap-2">
        <select name="metric" required defaultValue="steps" aria-label="القياس" style={fieldStyle}>
          <option value="steps">خطوات</option>
          <option value="heart_rate">نبض</option>
          <option value="sleep_hours">ساعات نوم</option>
          <option value="calories">سعرات محروقة</option>
          <option value="weight_kg">وزن</option>
          <option value="distance_km">مسافة كم</option>
        </select>
        <input type="number" name="value" required min={0} max={1000000} step="any" aria-label="القيمة" style={fieldStyle} />
      </div>
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
      {done ? <p role="status" style={{ margin: 0, fontSize: ".82rem", color: "#0b7a53" }}>تم التسجيل</p> : null}
      <button type="submit" disabled={busy} style={{ justifySelf: "start", border: "none", cursor: busy ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
        {busy ? "..." : "تسجيل"}
      </button>
    </form>
  );
}
