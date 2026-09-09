"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

export function InsuranceCopayClient({ requestId, dueAmount, approvalCode, locale }: {
  requestId: string; dueAmount: number; approvalCode: string; locale: string;
}) {
  const ar = locale === "ar";
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/insurance/requests/${encodeURIComponent(requestId)}/payment-intent`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-copay-${requestId}-${Date.now()}` },
        body: JSON.stringify({ method: "card" }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(ar ? "تعذر بدء الدفع" : "Could not start payment"); return; }
      const rec = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
      const checkoutUrl = typeof rec.checkoutUrl === "string" ? rec.checkoutUrl : typeof rec.checkout_url === "string" ? rec.checkout_url : null;
      const txnId = typeof rec.transactionId === "string" ? rec.transactionId : typeof rec.id === "string" ? rec.id : null;
      if (checkoutUrl) window.location.href = checkoutUrl;
      else if (txnId) router.push(`/${locale}/payments/processing?ref=${encodeURIComponent(txnId)}`);
      else setError(ar ? "تعذر بدء الدفع" : "Could not start payment");
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <p>{ar ? "كود الموافقة من نفيس:" : "NPHIES approval code:"} <strong>{approvalCode || "N/A"}</strong></p>
      <p><strong>{dueAmount} {ar ? "ر.س" : "SAR"}</strong></p>
      {error ? <p role="alert">{error}</p> : null}
      <button type="button" onClick={pay} disabled={busy}>
        {busy ? <LoaderCircle size={17} aria-hidden="true" /> : null}
        {busy ? (ar ? "جاري الدفع…" : "Processing…") : (ar ? "تأكيد الدفع" : "Confirm payment")}
      </button>
    </div>
  );
}
