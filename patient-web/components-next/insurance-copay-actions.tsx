"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Props = { locale: string; requestId: string; bookingId: string; state: string; copay: number };

/**
 * Server-owned actions for the coverage request (every button hits
 * a real BFF route that calls the patient API; no optimistic success).
 */
export function InsuranceCopayActions({ locale, requestId, bookingId, state, copay }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function settleZeroCopay() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/insurance/requests/${encodeURIComponent(requestId)}/pay-copay`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "تعذر تسجيل الموافقة — حاول لاحقًا");
        return;
      }
      router.refresh();
    } catch {
      setError("تعذر الاتصال — حاول لاحقًا");
    } finally {
      setBusy(false);
    }
  }

  async function checkoutCopay() {
    if (busy) return;
    // The BFF redirects (303) to the hosted checkout URL returned upstream.
    const form = document.createElement("form");
    form.method = "post";
    form.action = `/api/insurance/requests/${encodeURIComponent(requestId)}/payment-intent`;
    const key = document.createElement("input");
    key.type = "hidden"; key.name = "idempotency-key"; key.value = crypto.randomUUID();
    form.appendChild(key);
    document.body.appendChild(form);
    form.submit();
  }

  if (state === "PENDING_PROVIDER_REVIEW") {
    return (
      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <button type="button" className="w-full rounded-lg border border-black/15 py-2 font-semibold" onClick={() => router.refresh()} disabled={busy}>
          تحديث الحالة
        </button>
        {error ? <p className="text-sm text-red-600 mt-2" role="alert">{error}</p> : null}
      </section>
    );
  }
  if (state === "APPROVED_FULL") {
    return (
      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <button type="button" className="w-full rounded-lg bg-[#087f8c] py-3 font-bold text-white" onClick={settleZeroCopay} disabled={busy}>
          {busy ? "جارٍ التسجيل..." : "تأكيد الموافقة الكاملة"}
        </button>
        {error ? <p className="text-sm text-red-600 mt-2" role="alert">{error}</p> : null}
      </section>
    );
  }
  if (state === "COPAY_PENDING") {
    return (
      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <button type="button" className="w-full rounded-lg bg-[#087f8c] py-3 font-bold text-white" onClick={checkoutCopay} disabled={busy}>
          الانتقال للدفع الآمن — {copay} ر.س
        </button>
        {error ? <p className="text-sm text-red-600 mt-2" role="alert">{error}</p> : null}
      </section>
    );
  }
  if (state === "COPAY_PAID") {
    return (
      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
        <Link className="block w-full rounded-lg bg-[#087f8c] py-3 font-bold text-white text-center" href={`/${locale}/appointments/${bookingId}`}>
          عرض الموعد المؤكد
        </Link>
      </section>
    );
  }
  return null;
}
