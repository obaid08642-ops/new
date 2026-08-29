"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SupportFaq = { id: string; question: string; answer: string };
export type SupportTicket = { id: string; subject: string; status: string; createdAt?: string };

type Labels = {
  faqTitle: string; ticketsTitle: string; noTickets: string;
  subjectPlaceholder: string; messagePlaceholder: string;
  send: string; sending: string; sent: string; error: string;
};

export function SupportClient({ faqs, tickets, labels }: { faqs: SupportFaq[]; tickets: SupportTicket[]; labels: Labels }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit() {
    if (state === "loading" || !subject.trim() || !message.trim()) return;
    setState("loading");
    try {
      const response = await fetch("/api/patient/support/requests", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), category: "general" }),
      });
      if (!response.ok) throw new Error("support_request_failed");
      setSubject(""); setMessage(""); setState("success");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border, #d6dbe3)", fontSize: 15 } as const;
  return <div style={{ display: "grid", gap: 24 }}>
    <section>
      <h2>{labels.faqTitle}</h2>
      {faqs.length === 0 ? <p style={{ opacity: 0.7 }}>{labels.noTickets}</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {faqs.map((faq) => (
            <details key={faq.id} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 10, padding: "10px 14px" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>{faq.question}</summary>
              {faq.answer ? <p style={{ marginTop: 8, opacity: 0.8 }}>{faq.answer}</p> : null}
            </details>
          ))}
        </div>
      )}
    </section>
    <section>
      <h2>{labels.ticketsTitle}</h2>
      {tickets.length === 0 ? <p style={{ opacity: 0.7 }}>{labels.noTickets}</p> : (
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}>
          {tickets.map((ticket) => (
            <li key={ticket.id} style={{ border: "1px solid var(--border, #e2e7ee)", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong>{ticket.subject || ticket.id}</strong>
              <span style={{ fontSize: 13, opacity: 0.7 }}>{ticket.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
    <section style={{ display: "grid", gap: 10 }}>
      <input style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={labels.subjectPlaceholder} aria-label={labels.subjectPlaceholder} />
      <textarea style={{ ...inputStyle, minHeight: 120 }} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={labels.messagePlaceholder} aria-label={labels.messagePlaceholder} />
      <button type="button" onClick={submit} disabled={state === "loading" || !subject.trim() || !message.trim()} style={{ padding: "12px", borderRadius: 10, border: 0, background: "var(--primary, #0d6e56)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
        {state === "loading" ? labels.sending : labels.send}
      </button>
      {state === "success" && <p role="status">{labels.sent}</p>}
      {state === "error" && <p role="alert">{labels.error}</p>}
    </section>
  </div>;
}
