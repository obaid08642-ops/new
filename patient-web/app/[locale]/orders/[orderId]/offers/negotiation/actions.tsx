"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { buildNegotiationMessage } from "@/lib/api/pharmacy-negotiation";

type Labels = { send: string; accept: string; reject: string; remove: string; loading: string; error: string; success: string };
type Props = { threadId: string; messages: Array<{ id: string; substitute?: unknown }>; labels: Labels };

export function NegotiationActions({ threadId, messages, labels }: Props) {
  const router = useRouter(); const [state, setState] = useState<"idle" | "loading" | "error" | "success">("idle"); const [message, setMessage] = useState("");
  async function act(path: string, body: Record<string, unknown> = {}) { if (state === "loading") return; setState("loading"); setMessage(""); try { const response = await fetch(`/api/patient/pharmacy/chat/threads/${encodeURIComponent(threadId)}${path}`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(body) }); if (!response.ok) throw new Error("negotiation_action_unavailable"); setState("success"); setMessage(labels.success); router.refresh(); } catch { setState("error"); setMessage(labels.error); } }
  async function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const body = buildNegotiationMessage(form.get("text")); if (!body) { setState("error"); setMessage(labels.error); return; } await act("/messages", body); event.currentTarget.reset(); }
  return <section className="negotiationActions"><form onSubmit={send}><label><span className="sr-only">Message</span><textarea name="text" required maxLength={1000} rows={3} /></label><button type="submit" disabled={state === "loading"}>{state === "loading" ? labels.loading : labels.send}</button></form>{messages.filter((item) => item.substitute).map((item) => <div className="substituteActions" key={item.id}><button type="button" onClick={() => act(`/accept-substitute/${item.id}`)} disabled={state === "loading"}>{labels.accept}</button><button type="button" onClick={() => act("/reject")} disabled={state === "loading"}>{labels.reject}</button><button type="button" onClick={() => act("/remove-item")} disabled={state === "loading"}>{labels.remove}</button></div>)}{message && <p role={state === "error" ? "alert" : "status"}>{message}</p>}</section>;
}
