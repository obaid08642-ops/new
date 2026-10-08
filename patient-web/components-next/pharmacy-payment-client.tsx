"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Method = { id: "card" | "apple-pay" | "google-pay"; kind: "online" };

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isHttpsCheckout(url: unknown): url is string {
  return typeof url === "string" && url.startsWith("https://");
}

/** Parity with app/pharmacy/payment: server capabilities gate card payment;
 *  COD and insurance-covered orders never reach a checkout URL here. */
export function PharmacyPaymentClient({ orderId, locale }: { orderId: string; locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState("");
  const [coverage, setCoverage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [amount, setAmount] = useState(0);
  const [methods, setMethods] = useState<Method[]>([]);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [orderRes, capRes] = await Promise.all([
        fetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}`, { cache: "no-store", credentials: "same-origin" }),
        fetch(`/api/payments/pharmacy/${encodeURIComponent(orderId)}/capabilities`, { cache: "no-store", credentials: "same-origin" }),
      ]);
      const order = await orderRes.json().catch(() => null);
      const o = order?.data || order;
      setState(String(o?.governed_state || o?.effective_status || o?.status || ""));
      setCoverage(String(o?.coverage_mode || ""));
      setPaymentStatus(String(o?.payment_status || ""));
      if (capRes.ok) {
        const cap = await capRes.json().catch(() => null);
        setAmount(Number(cap?.amount || 0));
        setMethods(Array.isArray(cap?.methods) ? cap.methods : []);
      } else {
        setAmount(0); setMethods([]);
      }
    } catch {
      setError(ar ? "تعذر الاتصال" : "Connection unavailable");
    } finally {
      setLoading(false);
    }
  }, [orderId, ar]);

  useEffect(() => { void load(); }, [load]);

  async function pay(method: Method["id"]) {
    if (paying) return;
    setPaying(method); setError(null);
    try {
      const res = await fetch(`/api/payments/pharmacy/${encodeURIComponent(orderId)}/intent`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        credentials: "same-origin",
        body: JSON.stringify({ method }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "payment_intent_failed");
      const url = data?.checkout_url || data?.data?.checkout_url;
      if (!isHttpsCheckout(url)) throw new Error(ar ? "رابط الدفع الآمن غير متاح" : "Secure checkout unavailable");
      window.location.href = url;
    } catch (e: any) {
      setError(String(e?.message || "payment_intent_failed"));
    } finally {
      setPaying(null);
    }
  }

  if (loading) return <p>{ar ? "جارٍ التحميل…" : "Loading…"}</p>;
  if (error) return (
    <div>
      <p role="alert">{error}</p>
      <button type="button" onClick={() => void load()}>{ar ? "إعادة المحاولة" : "Retry"}</button>
    </div>
  );

  if (paymentStatus === "covered_by_insurance" || coverage === "insurance" && state === "CONFIRMED") {
    return <p>{ar ? "الطلب مغطى بالتأمين — لا يوجد مبلغ للدفع هنا." : "Covered by insurance — nothing to pay here."}</p>;
  }
  if (state === "COD_REGISTERED") {
    return <p>{ar ? "الدفع عند الاستلام — ادفع للمندوب عند وصول طلبك." : "Cash on delivery — pay the courier on arrival."}</p>;
  }

  const payable = (state === "FINAL_QUOTE_ACCEPTED" || state === "CO_PAY_PENDING") && amount > 0 && methods.length > 0;
  if (!payable) {
    return (
      <div>
        <p>{ar ? "الدفع بالبطاقة غير متاح لهذا الطلب حالياً." : "Card payment is unavailable for this order right now."}</p>
        <button type="button" onClick={() => router.push(`/${locale}/orders/${orderId}`)}>{ar ? "رجوع للطلب" : "Back to order"}</button>
      </div>
    );
  }

  const methodLabel = (m: Method["id"]) =>
    m === "card" ? (ar ? "بطاقة مدى/ائتمانية" : "Mada / Credit card") : m === "apple-pay" ? "Apple Pay" : "Google Pay";

  return (
    <div>
      <p>{ar ? `المبلغ المستحق: ${amount.toFixed(2)} ر.س` : `Amount due: ${amount.toFixed(2)} SAR`}</p>
      {methods.map((m) => (
        <button key={m.id} type="button" disabled={paying !== null} onClick={() => void pay(m.id)}>
          {paying === m.id ? (ar ? "جارٍ التحويل…" : "Redirecting…") : methodLabel(m.id)}
        </button>
      ))}
    </div>
  );
}
