"use client";

import Link from "next/link";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

export type SplitAction = "provider_review" | "covered" | "checkout_copay" | "accept_self_pay" | "checkout_self_pay" | "paid" | "unavailable";

export function InsurancePaymentSplitClient({ requestId, action, payable, bookingStatusHref, locale }: {
  requestId: string; action: SplitAction; payable: number; bookingStatusHref: string | null; locale: string;
}) {
  const ar = locale === "ar";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/insurance/requests/${encodeURIComponent(requestId)}/payment-intent`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-split-${requestId}-${Date.now()}` },
        body: JSON.stringify({ method: "card" }),
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setError(ar ? "تعذر بدء الدفع الآمن" : "Could not start secure payment"); return; }
      const rec = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
      const url = typeof rec.checkoutUrl === "string" ? rec.checkoutUrl : typeof rec.checkout_url === "string" ? rec.checkout_url : null;
      if (!url || !/^https:/.test(url)) { setError(ar ? "تعذر بدء الدفع الآمن" : "Could not start secure payment"); return; }
      window.location.href = url;
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setBusy(false); }
  }

  async function acceptSelfPay() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/insurance/requests/${encodeURIComponent(requestId)}/accept-self-pay`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-selfpay-${requestId}-${Date.now()}` },
        body: "{}",
        credentials: "same-origin",
      });
      if (!res.ok) { setError(ar ? "تعذر قبول الدفع الذاتي" : "Could not accept self-pay"); return; }
      window.location.reload();
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {error ? <p role="alert">{error}</p> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {action === "accept_self_pay" ? <button type="button" onClick={acceptSelfPay} disabled={busy}>{ar ? "قبول الدفع الذاتي" : "Accept self-pay"}</button> : null}
        {action === "checkout_copay" || action === "checkout_self_pay" ? (
          <button type="button" onClick={checkout} disabled={busy}>
            {busy ? <LoaderCircle size={17} aria-hidden="true" /> : null}
            {ar ? `الانتقال للدفع الآمن — ${payable} ر.س` : `Continue to secure payment — ${payable} SAR`}
          </button>
        ) : null}
        {(action === "covered" || action === "paid") && bookingStatusHref ? <Link href={bookingStatusHref}>{ar ? "عرض حالة الموعد" : "View appointment status"}</Link> : null}
      </div>
    </div>
  );
}
