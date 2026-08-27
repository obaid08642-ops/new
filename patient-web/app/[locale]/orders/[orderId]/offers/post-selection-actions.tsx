"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildCodRegistrationRequest, buildFinalQuoteAcceptanceRequest } from "@/lib/api/pharmacy-actions";

type Labels = { acceptQuote: string; registerCod: string; loading: string; quoteAccepted: string; codRegistered: string; error: string };
type Props = { orderId: string; quoteHash?: string; quoteRevision?: number; canAcceptQuote?: boolean; canRegisterCod?: boolean; labels: Labels };

export function PostSelectionActions({ orderId, quoteHash, quoteRevision, canAcceptQuote = false, canRegisterCod = false, labels }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send(kind: "quote" | "cod") {
    const request = kind === "quote"
      ? buildFinalQuoteAcceptanceRequest(orderId, quoteHash, quoteRevision)
      : buildCodRegistrationRequest(orderId);
    if (!request || state === "loading") return;
    setState("loading"); setMessage("");
    try {
      const response = await fetch(request.path, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(request.body) });
      if (!response.ok) throw new Error("pharmacy_action_unavailable");
      setState("success"); setMessage(kind === "quote" ? labels.quoteAccepted : labels.codRegistered); router.refresh();
    } catch { setState("error"); setMessage(labels.error); }
  }

  if (!canAcceptQuote && !canRegisterCod) return null;
  return <div className="postSelectionActions">
    {canAcceptQuote && <button type="button" onClick={() => send("quote")} disabled={state === "loading"}>{state === "loading" ? labels.loading : labels.acceptQuote}</button>}
    {canRegisterCod && <button type="button" onClick={() => send("cod")} disabled={state === "loading"}>{state === "loading" ? labels.loading : labels.registerCod}</button>}
    {message && <p role={state === "error" ? "alert" : "status"}>{message}</p>}
  </div>;
}
