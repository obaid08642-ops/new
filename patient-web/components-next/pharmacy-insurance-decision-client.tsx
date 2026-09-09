"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

type Method = { id: string; label: string };
type Decision = {
  state: string; decision: string; copay: number; currency: string;
  items: { name: string; decision: string; covered: number; copay: number }[];
  methods: Method[];
};

const METHODS: Method[] = [
  { id: "card", label: "بطاقة بنكية" },
  { id: "apple-pay", label: "Apple Pay" },
  { id: "google-pay", label: "Google Pay" },
];

function parseDecision(order: unknown, caps: unknown): Decision | null {
  const oroot = (order && typeof order === "object" ? order : {}) as Record<string, unknown>;
  const o = (oroot.data && typeof oroot.data === "object" ? oroot.data : oroot) as Record<string, unknown>;
  const croot = (caps && typeof caps === "object" ? caps : {}) as Record<string, unknown>;
  const clist = [croot.methods, croot.data].find(Array.isArray);
  const allowed = new Set(["card", "apple-pay", "google-pay"]);
  const methods = (Array.isArray(clist) ? clist : [])
    .flatMap((m) => {
      const id = typeof m === "string" ? m : typeof m === "object" && m !== null && typeof (m as Record<string, unknown>).id === "string" ? (m as Record<string, unknown>).id as string : null;
      if (!id || !allowed.has(id)) return [];
      return [{ id, label: METHODS.find((x) => x.id === id)?.label ?? id }];
    });
  const accepted = (o.accepted_quote_snapshot && typeof o.accepted_quote_snapshot === "object" ? o.accepted_quote_snapshot : {}) as Record<string, unknown>;
  const totals = (accepted.totals && typeof accepted.totals === "object" ? accepted.totals : {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(o.insurance_items) ? o.insurance_items : Array.isArray(o.items) ? o.items : [];
  return {
    state: typeof o.governed_state === "string" ? o.governed_state : "",
    decision: typeof o.insurance_decision === "string" ? o.insurance_decision : "",
    copay: Number(o.copay_amount ?? totals.copay ?? 0) || 0,
    currency: typeof totals.currency === "string" ? totals.currency : "SAR",
    items: itemsRaw.flatMap((it) => {
      if (!it || typeof it !== "object") return [];
      const r = it as Record<string, unknown>;
      const name = typeof r.raw_name === "string" ? r.raw_name : typeof r.order_item_id === "string" ? r.order_item_id : null;
      if (!name) return [];
      return [{
        name,
        decision: typeof r.decision === "string" ? r.decision : "",
        covered: Number(r.covered_amount ?? 0) || 0,
        copay: Number(r.co_pay_amount ?? r.copay_amount ?? 0) || 0,
      }];
    }),
    methods,
  };
}

export function PharmacyInsuranceDecisionClient({ orderId, locale }: { orderId: string; locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}`;

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [orderRes, capsRes] = await Promise.all([
        fetch(base, { cache: "no-store", credentials: "same-origin" }),
        fetch(`/api/patient/payments/pharmacy/${encodeURIComponent(orderId)}/capabilities`, { cache: "no-store", credentials: "same-origin" }),
      ]);
      if (!orderRes.ok) { setError(ar ? "تعذر تحميل قرار التأمين" : "Could not load insurance decision"); return; }
      const parsed = parseDecision(await orderRes.json().catch(() => null), capsRes.ok ? await capsRes.json().catch(() => null) : null);
      if (!parsed) { setError(ar ? "تعذر تحميل قرار التأمين" : "Could not load insurance decision"); return; }
      setDecision(parsed);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setLoading(false); }
  }, [base, orderId, ar]);

  useEffect(() => { load(); }, [load]);

  async function accept(kind: "co-pay" | "self-pay") {
    if (!method) { setError(ar ? "اختر وسيلة دفع أولاً" : "Choose a payment method first"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`${base}/insurance/${kind}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-ins-${kind}-${orderId}-${Date.now()}` },
        body: JSON.stringify({ payment_method: method }),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(ar ? "تعذر قبول القرار" : "Could not accept decision"); return; }
      router.replace(`/${locale}/orders/${encodeURIComponent(orderId)}/tracking?pay=1`);
    } catch { setError(ar ? "تعذر الاتصال" : "Connection unavailable"); }
    finally { setSaving(false); }
  }

  if (loading && !decision) return <p role="status"><LoaderCircle size={18} aria-hidden="true" /> {ar ? "جارٍ التحميل…" : "Loading…"}</p>;
  if (error && !decision) {
    return (
      <div>
        <p role="alert">{error}</p>
        <button type="button" onClick={load}>{ar ? "تحديث يدوياً" : "Refresh manually"}</button>
      </div>
    );
  }
  if (!decision) return null;

  if (decision.state === "CONFIRMED") return <p role="status">{ar ? "التأمين غطى الطلب بالكامل" : "Insurance covered the order in full"}</p>;
  if (decision.state === "INSURANCE_PROCESSING") {
    return (
      <div>
        <p role="status">{ar ? "يجري تجهيز قرار التأمين…" : "Preparing the insurance decision…"}</p>
        <button type="button" onClick={load}>{ar ? "تحديث يدوياً" : "Refresh manually"}</button>
      </div>
    );
  }
  const decisionLabel = decision.decision === "APPROVED_FULL"
    ? (ar ? "مغطى بالكامل" : "Fully covered")
    : decision.decision === "APPROVED_PARTIAL"
      ? (ar ? "مغطى جزئياً" : "Partially covered")
      : (ar ? "غير مغطى" : "Not covered");
  const canCoPay = decision.state === "INSURANCE_DECISION_READY" && ["APPROVED_FULL", "APPROVED_PARTIAL"].includes(decision.decision) && decision.copay > 0;
  const canSelfPay = decision.state === "INSURANCE_DECISION_READY" && ["APPROVED_PARTIAL", "REJECTED"].includes(decision.decision);

  return (
    <div>
      {error ? <p role="alert">{error}</p> : null}
      <p>{ar ? "قرار الطلب:" : "Order decision:"} <strong>{decisionLabel}</strong></p>
      <ul>
        {decision.items.map((item, i) => (
          <li key={i}>{item.name} — {ar ? "القرار:" : "Decision:"} {item.decision} — {ar ? "تغطية:" : "Covered:"} {item.covered} / {ar ? "تحمّل:" : "Co-pay:"} {item.copay} {decision.currency}</li>
        ))}
      </ul>
      {canCoPay || canSelfPay ? (
        <section aria-label={ar ? "اختر وسيلة الدفع" : "Choose payment method"}>
          <h2>{ar ? "اختر وسيلة الدفع" : "Choose a payment method"}</h2>
          {decision.methods.length === 0 ? <p role="alert">{ar ? "لا توجد وسائل دفع متاحة" : "No payment methods available"}</p> : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="radiogroup" aria-label={ar ? "وسيلة الدفع" : "Payment method"}>
            {decision.methods.map((m) => (
              <button key={m.id} type="button" role="radio" aria-checked={method === m.id} onClick={() => setMethod(m.id)}
                style={method === m.id ? { outline: "2px solid currentColor" } : undefined}>{ar ? m.label : m.id}</button>
            ))}
          </div>
          {canCoPay ? <button type="button" onClick={() => accept("co-pay")} disabled={saving || !method}>{ar ? `قبول نسبة التحمل (${decision.copay.toFixed(2)} ${decision.currency})` : `Accept co-pay (${decision.copay.toFixed(2)} ${decision.currency})`}</button> : null}
          {canSelfPay ? <button type="button" onClick={() => accept("self-pay")} disabled={saving || !method}>{ar ? "قبول الدفع الذاتي" : "Accept self-pay"}</button> : null}
        </section>
      ) : null}
    </div>
  );
}
