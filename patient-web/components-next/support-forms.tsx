"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/** Support parity #25: real ticket creation / thread reply through the BFF. */
export function SupportForms({ mode, ticketId }: { mode: "new" | "reply"; ticketId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (busy) return;
    const form = new FormData(formEvent.currentTarget);
    const payload = mode === "new"
      ? {
          subject: String(form.get("subject") || ""),
          message: String(form.get("message") || ""),
          ...(form.get("category") ? { category: String(form.get("category")) } : {}),
        }
      : { message: String(form.get("message") || "") };
    setBusy(true); setError(null); setDone(false);
    try {
      const path = mode === "new" ? "/api/support/new" : `/api/support/reply/${encodeURIComponent(ticketId || "")}`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر الإرسال");
        return;
      }
      setDone(true);
      if (mode === "new") formEvent.currentTarget.reset();
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: ".8rem", display: "grid", gap: ".6rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: "1rem" }} aria-label={mode === "new" ? "تذكرة جديدة" : "رد على التذكرة"}>
      <strong>{mode === "new" ? "تذكرة دعم جديدة" : "أضف ردًا"}</strong>
      {mode === "new" && (
        <>
          <input name="subject" required minLength={3} maxLength={200} aria-label="الموضوع" style={fieldStyle} />
          <select name="category" aria-label="التصنيف" defaultValue="GENERAL" style={fieldStyle}>
            <option value="GENERAL">عام</option>
            <option value="BILLING">فوترة</option>
            <option value="TECHNICAL">مشكلة تقنية</option>
            <option value="PHARMACY">صيدلية</option>
            <option value="BOOKING">حجوزات</option>
          </select>
        </>
      )}
      <textarea name="message" required minLength={5} maxLength={4000} rows={4} aria-label="الرسالة" style={{ ...fieldStyle, resize: "vertical", font: "inherit" }} />
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
      {done ? <p role="status" style={{ margin: 0, fontSize: ".82rem", color: "#0b7a53" }}>{mode === "new" ? "تم إنشاء التذكرة" : "تم إرسال الرد"}</p> : null}
      <button type="submit" disabled={busy} style={{ justifySelf: "start", border: "none", cursor: busy ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
        {busy ? "..." : mode === "new" ? "إرسال التذكرة" : "إرسال الرد"}
      </button>
    </form>
  );
}
