"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildOfferSelectionRequest, type PharmacyCoverageMode } from "@/lib/api/pharmacy-actions";

type Props = { orderId: string; offerId: string; insuranceReady?: boolean; labels: { cash: string; insurance: string; select: string; loading: string; selected: string; error: string } };

export function OfferSelection({ orderId, offerId, insuranceReady = false, labels }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<PharmacyCoverageMode>("cash");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function selectOffer() {
    const request = buildOfferSelectionRequest(orderId, offerId, mode);
    if (!request || state === "loading") return;
    setState("loading");
    setMessage("");
    try {
      const response = await fetch(request.path, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(request.body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(payload?.message || "selection_unavailable");
      }
      setState("success");
      setMessage(labels.selected);
      router.refresh();
    } catch {
      setState("error");
      setMessage(labels.error);
    }
  }

  return <div className="offerSelection">
    <fieldset disabled={state === "loading"}>
      <legend>{labels.select}</legend>
      <label><input type="radio" name={`coverage-${offerId}`} checked={mode === "cash"} onChange={() => setMode("cash")} /> {labels.cash}</label>
      {insuranceReady && <label><input type="radio" name={`coverage-${offerId}`} checked={mode === "insurance"} onChange={() => setMode("insurance")} /> {labels.insurance}</label>}
    </fieldset>
    <button type="button" onClick={selectOffer} disabled={state === "loading"}>{state === "loading" ? labels.loading : labels.select}</button>
    {message && <p role={state === "error" ? "alert" : "status"}>{message}</p>}
  </div>;
}
