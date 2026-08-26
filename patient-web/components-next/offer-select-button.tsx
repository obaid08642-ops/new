"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Offer selection (PH-PHARMACY): real JSON post to the select-offer BFF
 * (CSRF+auth enforced there); on success lands on the payment chooser.
 */
export function OfferSelectButton({ orderId, pharmacyAccountId }: { orderId: string; pharmacyAccountId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function select() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/pharmacy/orders/${encodeURIComponent(orderId)}/select-offer`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ pharmacy_account_id: pharmacyAccountId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message === "unauthenticated" ? "انتهت الجلسة — سجّل الدخول من جديد" : data?.message || "تعذر اختيار العرض");
        return;
      }
      router.push(`/ar/pharmacy/pay?orderId=${encodeURIComponent(orderId)}`);
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button type="button" onClick={select} disabled={busy}
        className="rounded-lg bg-[#087f8c] px-4 py-2 font-semibold"
        style={{ color: "#fff", cursor: busy ? "wait" : "pointer" }}>
        {busy ? "جارٍ القفل..." : "اختيار هذا العرض والدفع"}
      </button>
      {error ? <p role="alert" className="text-xs text-red-600 mt-1">{error}</p> : null}
    </span>
  );
}
