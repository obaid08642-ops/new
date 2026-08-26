"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fieldStyle: React.CSSProperties = { width: "100%", borderRadius: ".7rem", border: "1px solid rgba(229,232,238,.9)", padding: ".55rem .8rem", font: "inherit" };

/**
 * New refund request (parity #26): real POST /api/refunds — the server
 * resolves ownership, paid amount and the policy percent from its records.
 */
export function RefundRequestForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (busy) return;
    const form = new FormData(formEvent.currentTarget);
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          booking_id: String(form.get("booking_id") || ""),
          reason: String(form.get("reason") || ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "authentication_required" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر إرسال الطلب");
        return;
      }
      setResult(`تم استلام الطلب — النسبة ${Number(data?.refund_percent ?? 0)}% والمبلغ التقديري ${Number(data?.refund_amount ?? 0)} ر.س`);
      formEvent.currentTarget.reset();
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: "1rem", display: "grid", gap: ".6rem", border: "1px solid rgba(229,232,238,.9)", borderRadius: "1rem", background: "#f8fdfe", padding: "1rem" }} aria-label="طلب استرداد جديد">
      <strong>طلب استرداد جديد</strong>
      <label className="text-sm">معرّف الحجز/الطلب
        <input name="booking_id" required minLength={3} maxLength={80} style={{ ...fieldStyle, marginTop: ".25rem" }} />
      </label>
      <label className="text-sm">سبب الإرجاع
        <textarea name="reason" required minLength={3} maxLength={1000} rows={3} style={{ ...fieldStyle, marginTop: ".25rem", resize: "vertical", font: "inherit" }} />
      </label>
      {error ? <p role="alert" style={{ margin: 0, fontSize: ".82rem", color: "#c0392b" }}>{error}</p> : null}
      {result ? <p role="status" style={{ margin: 0, fontSize: ".82rem", color: "#0b7a53" }}>{result}</p> : null}
      <button type="submit" disabled={busy} style={{ justifySelf: "start", border: "none", cursor: busy ? "wait" : "pointer", borderRadius: "999px", background: "#087f8c", color: "#fff", fontWeight: 700, padding: ".55rem 1.2rem" }}>
        {busy ? "..." : "إرسال الطلب"}
      </button>
    </form>
  );
}
