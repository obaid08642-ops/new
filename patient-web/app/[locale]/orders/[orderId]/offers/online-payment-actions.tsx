"use client";

import { useState } from "react";
import { parsePaymentIntent } from "@/lib/api/payments";
import { isTrustedCheckoutUrl, parsePatientPharmacyPaymentCapabilities, type PatientPharmacyOnlineMethod } from "@/lib/api/pharmacy-payment";

type Labels = { showMethods: string; loading: string; unavailable: string; method: Record<PatientPharmacyOnlineMethod, string>; redirecting: string; noRedirect: string; error: string };
type Props = { orderId: string; labels: Labels };

export function OnlinePaymentActions({ orderId, labels }: Props) {
  const [methods, setMethods] = useState<PatientPharmacyOnlineMethod[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [message, setMessage] = useState("");

  async function loadMethods() {
    if (state === "loading") return;
    setState("loading"); setMessage("");
    try {
      const response = await fetch(`/api/patient/payments/pharmacy/${encodeURIComponent(orderId)}/capabilities`, { cache: "no-store" });
      const capabilities = response.ok ? parsePatientPharmacyPaymentCapabilities(await response.json().catch(() => null)) : null;
      if (!capabilities || capabilities.methods.length === 0) throw new Error("payment_capabilities_unavailable");
      setMethods(capabilities.methods.map((method) => method.id)); setState("ready");
    } catch { setState("error"); setMessage(labels.unavailable); }
  }

  async function start(method: PatientPharmacyOnlineMethod) {
    if (state === "loading") return;
    setState("loading"); setMessage("");
    try {
      const response = await fetch(`/api/patient/payments/intent/pharmacy/${encodeURIComponent(orderId)}`, {
        method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ method }),
      });
      const intent = response.ok ? parsePaymentIntent(await response.json().catch(() => null)) : null;
      if (!intent) throw new Error("payment_intent_unavailable");
      if (isTrustedCheckoutUrl(intent.checkoutUrl)) { setMessage(labels.redirecting); window.location.assign(intent.checkoutUrl); return; }
      setState("ready"); setMessage(labels.noRedirect);
    } catch { setState("error"); setMessage(labels.error); }
  }

  return <div className="onlinePaymentActions">
    {methods === null && <button type="button" onClick={loadMethods} disabled={state === "loading"}>{state === "loading" ? labels.loading : labels.showMethods}</button>}
    {methods?.map((method) => <button key={method} type="button" onClick={() => start(method)} disabled={state === "loading"}>{state === "loading" ? labels.loading : labels.method[method]}</button>)}
    {message && <p role={state === "error" ? "alert" : "status"}>{message}</p>}
  </div>;
}
