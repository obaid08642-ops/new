"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/**
 * Post-service review (parity #27): submits a 1..5 rating + comment through
 * the BFF — the server validates ownership context and recomputes averages.
 */
export function ReviewForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (busy) return;
    const form = new FormData(formEvent.currentTarget);
    setBusy(true); setError(null); setDone(null);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          entity_type: String(form.get("entity_type") || ""),
          entity_id: String(form.get("entity_id") || ""),
          provider_id: String(form.get("provider_id") || ""),
          score: Number(form.get("score")),
          ...(String(form.get("comment") || "") ? { comment: String(form.get("comment")) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر إرسال التقييم");
        return;
      }
      setDone(data?.updated ? "تم تحديث تقييمك" : "تم إرسال تقييمك");
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: ".9rem", display: "grid", gap: ".6rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: "1rem" }} aria-label="تقييم الخدمة">
      <strong>قيّم خدمتك</strong>
      <label className="text-sm">نوع الحجز
        <select name="entity_type" required defaultValue="appointment" style={{ ...fieldStyle, marginTop: ".25rem" }}>
          <option value="appointment">استشارة</option>
          <option value="lab_booking">تحليل</option>
          <option value="radiology_booking">أشعة</option>
          <option value="homecare_booking">تمريض منزلي</option>
          <option value="order">طلب صيدلية</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input name="entity_id" required minLength={3} maxLength={80} aria-label="معرّف الحجز" style={fieldStyle} />
        <input name="provider_id" required minLength={3} maxLength={80} aria-label="معرّف المزود" style={fieldStyle} />
      </div>
      <fieldset className="flex items-center gap-3 text-sm" style={{ border: "none", padding: 0 }}>
        <legend className="mb-1">التقييم</legend>
        {[5, 4, 3, 2, 1].map((score) => (
          <label key={score}>
            <input type="radio" name="score" value={score} required defaultChecked={score === 5} /> {score} ★
          </label>
        ))}
      </fieldset>
      <textarea name="comment" maxLength={2000} rows={3} aria-label="تعليق (اختياري)" style={{ ...fieldStyle, resize: "vertical", font: "inherit" }} />
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
      {done ? <p role="status" style={{ margin: 0, fontSize: ".82rem", color: "#0b7a53" }}>{done}</p> : null}
      <button type="submit" disabled={busy} style={{ justifySelf: "start", border: "none", cursor: busy ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
        {busy ? "..." : "إرسال التقييم"}
      </button>
    </form>
  );
}
