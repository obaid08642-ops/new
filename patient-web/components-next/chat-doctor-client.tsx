"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Bot, Send, Sparkles, User } from "lucide-react";
import styles from "@/app/[locale]/ai/triage.module.css";

function extractReply(payload: unknown): string | null {
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  const source = root && typeof root.data === "object" && root.data !== null ? (root.data as Record<string, unknown>) : root;
  if (!source) return null;
  for (const key of ["response", "reply", "answer", "triage", "assessment", "summary"]) {
    const v = source[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

type Msg = { id: string; role: "user" | "assistant"; content: string };

export function ChatDoctorClient({ locale, initialMessages }: { locale: string; initialMessages: Msg[] }) {
  const ar = locale === "ar";
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading || text.length < 2) return;
    setError(null);
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/patient/ai/triage", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ symptoms: text, red_flags: [] }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as { message?: string })?.message ?? "triage_failed");
      const reply = extractReply(data) ?? (typeof data === "string" ? data : JSON.stringify(data, null, 2));
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
      // keep scroll at bottom
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
    } catch {
      setError(ar ? "تعذر الحصول على رد. حاول مرة أخرى." : "Could not get a response. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Messages — glass container */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label={ar ? "محادثة الطبيب الذكي" : "AI Doctor chat"}
        style={{
          display: "grid",
          gap: 8,
          maxHeight: 420,
          overflowY: "auto",
          padding: 8,
          borderRadius: 20,
          border: "1px solid #E8EDEE",
          background: "#FDFDFC",
          scrollbarWidth: "thin",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              padding: 16,
              borderRadius: 20,
              border: "1px dashed #E8EDEE",
              background: "rgba(255,255,255,0.76)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              textAlign: "center",
              color: "#6B7C6E",
              fontSize: 13,
              lineHeight: 1.7,
              overflowWrap: "anywhere",
            }}
          >
            <Bot size={20} color="#1E332E" aria-hidden="true" style={{ margin: "0 auto 8px", display: "block" }} />
            <p style={{ margin: 0, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {ar ? "مرحباً — صف أعراضك وسأجيب كمساعد فرز أولي. النتيجة استرشادية فقط." : "Hi — describe your symptoms and I’ll respond as a triage assistant. Advisory only."}
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                gap: 8,
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-start",
              }}
            >
              {m.role === "assistant" && (
                <span
                  style={{
                    flex: "0 0 auto",
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(95,217,179,0.16)",
                    border: "1px solid #E8EDEE",
                  }}
                >
                  <Bot size={16} color="#1E332E" aria-hidden="true" />
                </span>
              )}
              <div
                style={{
                  maxWidth: "82%",
                  padding: "12px 14px",
                  borderRadius: 20,
                  border: "1px solid #E8EDEE",
                  background: m.role === "user" ? "#5FD9B3" : "rgba(255,255,255,0.90)",
                  backdropFilter: m.role === "assistant" ? "blur(16px)" : undefined,
                  WebkitBackdropFilter: m.role === "assistant" ? "blur(16px)" : undefined,
                  color: "#1E332E",
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  boxShadow: m.role === "user" ? "0 4px 14px rgba(95,217,179,0.25)" : "0 4px 14px rgba(22,71,84,0.04)",
                }}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <span
                  style={{
                    flex: "0 0 auto",
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "#1E332E",
                    color: "#FDFDFC",
                  }}
                >
                  <User size={14} aria-hidden="true" />
                </span>
              )}
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#6B7C6E", fontSize: 13, padding: "4px 8px", overflowWrap: "anywhere" }}>
            <Sparkles size={14} aria-hidden="true" style={{ animation: "pulse 1.2s ease-in-out infinite" } as React.CSSProperties} />
            <span style={{ overflowWrap: "anywhere" }}>{ar ? "جارٍ التحليل..." : "Analyzing..."}</span>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "#92400e", background: "#FFFBEB", border: "1px solid #E8EDEE", borderRadius: 12, padding: "12px 16px", fontSize: 13, lineHeight: 1.6, overflowWrap: "anywhere", margin: 0 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <span style={{ overflowWrap: "anywhere" }}>{error}</span>
        </p>
      )}

      {/* Composer — radius 20, border #E8EDEE, button #5FD9B3 */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={ar ? "اكتب أعراضك هنا..." : "Type your symptoms..."}
            aria-label={ar ? "رسالة إلى الطبيب الذكي" : "Message to AI Doctor"}
            rows={2}
            className={styles.textarea}
            style={{ minHeight: 56, padding: 14, borderRadius: 20, overflowWrap: "anywhere", resize: "none" }}
          />
        </div>
        <button
          type="button"
          onClick={send}
          disabled={loading || input.trim().length < 2}
          aria-label={ar ? "إرسال" : "Send"}
          style={{
            flex: "0 0 auto",
            width: 52,
            height: 52,
            borderRadius: 20,
            border: "1px solid #E8EDEE",
            background: "#5FD9B3",
            color: "#1E332E",
            display: "grid",
            placeItems: "center",
            cursor: loading || input.trim().length < 2 ? "not-allowed" : "pointer",
            opacity: loading || input.trim().length < 2 ? 0.6 : 1,
            boxShadow: "0 4px 16px rgba(95,217,179,0.28)",
          }}
        >
          <Send size={18} aria-hidden="true" />
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "12px 16px", borderRadius: 12, background: "#FFFBEB", border: "1px solid #E8EDEE", color: "#92400e", fontSize: 13, lineHeight: 1.6, overflowWrap: "anywhere" }}>
        <AlertTriangle size={16} color="#b45309" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ overflowWrap: "anywhere" }}>{ar ? "تنبيه: محادثة الطبيب الذكي نتيجة استرشادية فقط ولا تغني عن استشارة طبيب مختص." : "Disclaimer: AI Doctor is advisory only and does not replace a licensed clinician."}</span>
      </div>
    </div>
  );
}
