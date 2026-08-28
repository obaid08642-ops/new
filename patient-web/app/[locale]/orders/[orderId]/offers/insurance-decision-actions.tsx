"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parsePatientPharmacyPaymentCapabilities, type PatientPharmacyOnlineMethod } from "@/lib/api/pharmacy-payment";

type Intent = "co-pay" | "self-pay";
type Labels = { loadMethods: string; loading: string; unavailable: string; error: string; accepted: Record<Intent, string>; method: Record<PatientPharmacyOnlineMethod, string>; action: Record<Intent, string> };
type Props = { orderId: string; canCoPay: boolean; canSelfPay: boolean; labels: Labels };

export function InsuranceDecisionActions({ orderId, canCoPay, canSelfPay, labels }: Props) {
  const router = useRouter();
  const [methods, setMethods] = useState<PatientPharmacyOnlineMethod[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");

  async function loadMethods() {
    if (state === "loading") return;
    setState("loading"); setMessage("");
    try {
      const response = await fetch(`/api/patient/payments/pharmacy/${encodeURIComponent(orderId)}/capabilities`, { cache: "no-store" });
      const capabilities = response.ok ? parsePatientPharmacyPaymentCapabilities(await response.json().catch(() => null)) : null;
      if (!capabilities || capabilities.methods.length === 0) throw new Error("insurance_payment_capabilities_unavailable");
      setMethods(capabilities.methods.map((method) => method.id)); setState("ready");
    } catch { setState("error"); setMessage(labels.unavailable); }
  }

  async function accept(intent: Intent, method: PatientPharmacyOnlineMethod) {
    if (state === "loading") return;
    setState("loading"); setMessage("");
    try {
      const response = await fetch(`/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/insurance/${intent}/accept`, {
        method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ payment_method: method }),
      });
      if (!response.ok) throw new Error("insurance_acceptance_unavailable");
      setState("ready"); setMessage(labels.accepted[intent]); router.refresh();
    } catch { setState("error"); setMessage(labels.error); }
  }

  if (!canCoPay && !canSelfPay) return null;
  return <div className="insuranceDecisionActions">
    {methods === null && <button type="button" onClick={loadMethods} disabled={state === "loading"}>{state === "loading" ? labels.loading : labels.loadMethods}</button>}
    {methods?.flatMap((method) => [
      ...(canCoPay ? [<button key={`copay-${method}`} type="button" onClick={() => accept("co-pay", method)} disabled={state === "loading"}>{labels.action["co-pay"]}: {labels.method[method]}</button>] : []),
      ...(canSelfPay ? [<button key={`selfpay-${method}`} type="button" onClick={() => accept("self-pay", method)} disabled={state === "loading"}>{labels.action["self-pay"]}: {labels.method[method]}</button>] : []),
    ])}
    {message && <p role={state === "error" ? "alert" : "status"}>{message}</p>}
  </div>;
}
