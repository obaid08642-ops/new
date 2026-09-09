"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["consultation", "diagnostics", "pharmacy", "nursing"] as const;
const DEFAULT_AMOUNTS: Record<(typeof TYPES)[number], number> = {
  consultation: 250,
  diagnostics: 120,
  pharmacy: 80,
  nursing: 80,
};

export function ReturnRequestForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [serviceType, setServiceType] = useState<(typeof TYPES)[number]>("consultation");
  const [reason, setReason] = useState("");
  const [orderId, setOrderId] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ar = locale === "ar";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (reason.trim().length < 3) {
      setError(ar ? "اذكر سبب الإرجاع" : "State the return reason");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceType,
          reason: reason.trim(),
          orderId: orderId.trim(),
          details: details.trim(),
          refundMethod: "wallet",
          amount: DEFAULT_AMOUNTS[serviceType],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "تعذر إرسال الطلب" : "Could not submit request"));
        return;
      }
      router.push(`/${locale}/returns`);
      router.refresh();
    } catch {
      setError(ar ? "تعذر إرسال الطلب" : "Could not submit request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "نوع الخدمة" : "Service type"}</span>
        <select value={serviceType} onChange={(e) => setServiceType(e.target.value as (typeof TYPES)[number])}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "السبب" : "Reason"}</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={3} required />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "رقم الطلب (اختياري)" : "Order ID (optional)"}</span>
        <input value={orderId} onChange={(e) => setOrderId(e.target.value)} maxLength={128} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "تفاصيل (اختياري)" : "Details (optional)"}</span>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} rows={3} />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={saving}>{saving ? (ar ? "جارٍ الإرسال..." : "Sending...") : (ar ? "إرسال طلب الإرجاع" : "Submit return request")}</button>
    </form>
  );
}
