"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, HelpCircle, LifeBuoy, LoaderCircle, MessageSquarePlus, Package, Search, Send } from "lucide-react";
import styles from "./support.module.css";

export type SupportFaq = { id: string; question: string; answer: string };
export type SupportTicket = { id: string; subject: string; status: string; createdAt?: string };

type Labels = {
  faqTitle: string;
  ticketsTitle: string;
  noTickets: string;
  subjectPlaceholder: string;
  messagePlaceholder: string;
  send: string;
  sending: string;
  sent: string;
  error: string;
  searchPlaceholder: string;
  noFaqResults: string;
  orderHelpLabel: string;
  orderIdPlaceholder: string;
};

/** P22: client-side search over help-center articles (question + answer). */
export function filterFaqs(faqs: SupportFaq[], query: string): SupportFaq[] {
  const q = query.trim().toLowerCase();
  if (!q) return faqs;
  return faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q),
  );
}

export function SupportClient({ faqs, tickets, labels, ordersHref }: { faqs: SupportFaq[]; tickets: SupportTicket[]; labels: Labels; ordersHref: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [orderId, setOrderId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const visibleFaqs = filterFaqs(faqs, search);

  async function submit() {
    if (state === "loading" || !subject.trim() || !message.trim()) return;
    setState("loading");
    try {
      const trimmedOrderId = orderId.trim();
      const response = await fetch("/api/patient/support/requests", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          category: "GENERAL",
          ...(trimmedOrderId ? { order_id: trimmedOrderId } : {}),
        }),
      });
      if (!response.ok) throw new Error("support_request_failed");
      setSubject("");
      setMessage("");
      setOrderId("");
      setState("success");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  const isLoading = state === "loading";

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* FAQ Section */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <HelpCircle size={20} aria-hidden="true" />
          {labels.faqTitle}
        </h2>
        <div style={{ position: "relative" }}>
          <Search size={16} aria-hidden="true" style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input
            type="search"
            role="searchbox"
            className={styles.input}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.searchPlaceholder}
            style={{ paddingInlineStart: 36 }}
          />
        </div>
        {visibleFaqs.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>{search.trim() ? labels.noFaqResults : labels.noTickets}</p>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {visibleFaqs.map((faq) => (
              <details key={faq.id} className={styles.faqDetails}>
                <summary className={styles.faqSummary}>
                  <span>{faq.question}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </summary>
                {faq.answer ? <p className={styles.faqAnswer}>{faq.answer}</p> : null}
              </details>
            ))}
          </div>
        )}
      </section>

      {/* Tickets List */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <LifeBuoy size={20} aria-hidden="true" />
          {labels.ticketsTitle}
        </h2>
        {tickets.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>{labels.noTickets}</p>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {tickets.map((ticket) => (
              <div key={ticket.id} className={styles.ticketItem}>
                <strong className={styles.ticketSubject}>{ticket.subject || ticket.id}</strong>
                <span className={styles.ticketStatus}>{ticket.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* New Support Request Form */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <MessageSquarePlus size={20} aria-hidden="true" />
          {labels.subjectPlaceholder}
        </h2>
        <div style={{ display: "grid", gap: "0.85rem" }}>
          <a
            href={ordersHref}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--brand-deep)", fontWeight: 750, textDecoration: "none" }}
          >
            <Package size={16} aria-hidden="true" />
            {labels.orderHelpLabel}
          </a>
          <input
            className={styles.input}
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder={labels.orderIdPlaceholder}
            aria-label={labels.orderIdPlaceholder}
            inputMode="text"
          />
          <input
            className={styles.input}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={labels.subjectPlaceholder}
            aria-label={labels.subjectPlaceholder}
          />
          <textarea
            className={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={labels.messagePlaceholder}
            aria-label={labels.messagePlaceholder}
          />
          <button
            type="button"
            className={styles.submitBtn}
            onClick={submit}
            disabled={isLoading || !subject.trim() || !message.trim()}
          >
            {isLoading ? (
              <LoaderCircle size={17} style={{ animation: "spin 0.8s linear infinite" }} />
            ) : state === "success" ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <Send size={17} aria-hidden="true" />
            )}
            {isLoading ? labels.sending : labels.send}
          </button>
          {state === "success" && <p className={styles.statusSuccess} role="status">{labels.sent}</p>}
          {state === "error" && <p className={styles.statusError} role="alert">{labels.error}</p>}
        </div>
      </section>
    </div>
  );
}
