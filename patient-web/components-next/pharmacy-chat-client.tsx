"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Thread = { id: string; order_item_id?: string };
type Message = { id: string; sender_role?: string; text?: string; substitute_offer?: { name?: string; sku?: string; price?: number } };

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Parity with app/pharmacy/pharmacist-chat: threads, send, substitute accept/reject. */
export function PharmacyChatClient({ orderId, locale }: { orderId: string; locale: string }) {
  const ar = locale === "ar";
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async (tid: string) => {
    const res = await fetch(`/api/patient/pharmacy/chat/threads/${encodeURIComponent(tid)}/messages`, { cache: "no-store", credentials: "same-origin" });
    const data = await res.json().catch(() => null);
    setMessages(Array.isArray(data?.messages) ? data.messages : Array.isArray(data) ? data : []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/patient/pharmacy/chat/threads?order_id=${encodeURIComponent(orderId)}`, { cache: "no-store", credentials: "same-origin" });
      const data = await res.json().catch(() => null);
      const list: Thread[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setThreads(list);
      const next = threadId && list.some((t) => t.id === threadId) ? threadId : list[0]?.id || null;
      setThreadId(next);
      if (next) await loadMessages(next); else setMessages([]);
    } catch {
      setError(ar ? "تعذر تحميل المحادثة" : "Could not load negotiation");
    } finally {
      setLoading(false);
    }
  }, [orderId, threadId, loadMessages, ar]);

  useEffect(() => { void load(); }, [load]);

  async function send() {
    if (!threadId || sending || !text.trim()) return;
    setSending(true); setError(null);
    try {
      const res = await fetch(`/api/patient/pharmacy/chat/threads/${encodeURIComponent(threadId)}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        credentials: "same-origin",
        body: JSON.stringify({ text: text.trim().slice(0, 1000) }),
      });
      if (!res.ok) throw new Error(ar ? "تعذر إرسال الرسالة" : "Message failed");
      setText("");
      await loadMessages(threadId);
    } catch (e: any) {
      setError(String(e?.message || "send_failed"));
    } finally {
      setSending(false);
    }
  }

  async function act(path: string) {
    if (!threadId || sending) return;
    setSending(true); setError(null);
    try {
      const res = await fetch(`/api/patient/pharmacy/chat/threads/${encodeURIComponent(threadId)}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": newIdempotencyKey() },
        credentials: "same-origin",
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(ar ? "تعذر تسجيل القرار" : "Decision failed");
      await load();
    } catch (e: any) {
      setError(String(e?.message || "decision_failed"));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p>{ar ? "جارٍ التحميل…" : "Loading…"}</p>;

  return (
    <div>
      {threads.length > 1 && (
        <div role="tablist" aria-label={ar ? "المحادثات" : "Threads"}>
          {threads.map((t) => (
            <button key={t.id} role="tab" aria-selected={t.id === threadId} type="button" disabled={t.id === threadId}
              onClick={() => { setThreadId(t.id); void loadMessages(t.id); }}>
              {ar ? `بند ${(t.order_item_id || "").slice(-5) || "—"}` : `Item ${(t.order_item_id || "").slice(-5) || "—"}`}
            </button>
          ))}
        </div>
      )}
      {error ? <p role="alert">{error}</p> : null}
      {messages.length === 0 && !error ? (
        <p>{ar ? "لا توجد محادثة تفاوض مفتوحة لهذا الطلب." : "No open negotiation for this order."}</p>
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m.id} data-sender={m.sender_role || "unknown"}>
              <p>{m.text || "—"}</p>
              {m.substitute_offer ? (
                <div>
                  <p>{ar ? `بديل مقترح: ${m.substitute_offer.name || m.substitute_offer.sku || "—"}` : `Suggested substitute: ${m.substitute_offer.name || m.substitute_offer.sku || "—"}`}</p>
                  {Number.isFinite(Number(m.substitute_offer.price)) ? (
                    <p>{Number(m.substitute_offer.price).toFixed(2)} {ar ? "ر.س" : "SAR"}</p>
                  ) : null}
                  <p>{ar ? "القبول النهائي يتم في السعر النهائي الجديد فقط." : "Acceptance only takes effect in the new final quote."}</p>
                  <div>
                    <button type="button" disabled={sending} onClick={() => void act(`/accept-substitute/${encodeURIComponent(m.id)}`)}>
                      {ar ? "قبول بانتظار السعر النهائي" : "Accept pending final quote"}
                    </button>
                    <button type="button" disabled={sending} onClick={() => void act("/reject")}>{ar ? "رفض البديل" : "Reject substitute"}</button>
                    <button type="button" disabled={sending} onClick={() => void act("/remove-item")}>{ar ? "طلب حذف البند" : "Request item removal"}</button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <div>
        <label>
          {ar ? "اكتب رسالة للصيدلية" : "Message the pharmacy"}
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000}
            disabled={sending || !threadId} placeholder={ar ? "اكتب رسالة…" : "Type a message…"} rows={2} />
        </label>
        <button type="button" disabled={sending || !threadId || !text.trim()} onClick={() => void send()}>
          {sending ? (ar ? "جارٍ الإرسال…" : "Sending…") : (ar ? "إرسال" : "Send")}
        </button>
        <button type="button" onClick={() => router.push(`/${locale}/orders/${orderId}`)}>{ar ? "رجوع للطلب" : "Back to order"}</button>
      </div>
    </div>
  );
}
