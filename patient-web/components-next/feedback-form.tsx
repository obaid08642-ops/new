"use client";

import { useState } from "react";

const TYPES = ["اقتراح", "مشكلة", "شكوى", "إطراء", "استفسار"];

export function FeedbackForm({ locale }: { locale: string }) {
  const [rating, setRating] = useState(0);
  const [type, setType] = useState(TYPES[0]);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const ar = locale === "ar";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) {
      setError(ar ? "اكتب رسالتك أولاً" : "Write your message first");
      return;
    }
    setSending(true);
    try {
      // Backend binding: real upstream via /api/support/feedback → callPatientApi, no mock
      const res = await fetch("/api/support/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, type, message: text.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError((data as { message?: string })?.message || (ar ? "فشل الإرسال" : "Send failed"));
        return;
      }
      setSent(true);
    } catch {
      setError(ar ? "فشل الإرسال" : "Send failed");
    } finally {
      setSending(false);
    }
  }

  if (sent)
    return (
      <p
        role="status"
        style={{
          margin: 0,
          padding: 16,
          borderRadius: 20,
          border: "1px solid #E8EDEE",
          background: "rgba(255,255,255,.82)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          color: "#1E332E",
          fontWeight: 700,
          overflowWrap: "anywhere",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        } as any}
      >
        {ar ? "وصل اقتراحك للإدارة وسيُطبَّق بعد الاعتماد. شكراً لك." : "Feedback received. Thank you."}
      </p>
    );

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <span style={{ color: "#1E332E", fontWeight: 760, fontSize: ".9rem", overflowWrap: "anywhere" } as any}>
          {ar ? "التقييم" : "Rating"}
        </span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="radiogroup" aria-label={ar ? "التقييم" : "Rating"}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-pressed={rating === n}
              style={{
                inlineSize: 48,
                blockSize: 48,
                display: "grid",
                placeItems: "center",
                borderRadius: 16,
                border: "1px solid #E8EDEE",
                background: rating === n ? "#5FD9B3" : "rgba(255,255,255,.82)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                color: "#1E332E",
                fontWeight: 800,
                fontSize: ".9rem",
                cursor: "pointer",
              } as any}
            >
              {n}★
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ color: "#1E332E", fontWeight: 760, fontSize: ".9rem", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
          {ar ? "النوع" : "Type"}
        </span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            padding: "12px 14px",
            borderRadius: 20,
            border: "1px solid #E8EDEE",
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "#1E332E",
            fontWeight: 600,
            overflowWrap: "anywhere",
          } as any}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ color: "#1E332E", fontWeight: 760, fontSize: ".9rem", overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
          {ar ? "رسالتك" : "Your message"}
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={4}
          required
          style={{
            padding: "14px 14px",
            borderRadius: 20,
            border: "1px solid #E8EDEE",
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "#1E332E",
            lineHeight: 1.6,
            overflowWrap: "anywhere",
            resize: "vertical",
          } as any}
        />
      </label>

      {error ? (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: 12,
            borderRadius: 16,
            border: "1px solid #E8EDEE",
            background: "rgba(255,255,255,.82)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "#b91c1c",
            overflowWrap: "anywhere",
          } as any}
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        style={{
          padding: "12px 16px",
          borderRadius: 20,
          border: "1px solid #E8EDEE",
          background: "#5FD9B3",
          color: "#1E332E",
          fontWeight: 800,
          fontSize: ".9rem",
          cursor: sending ? "not-allowed" : "pointer",
          opacity: sending ? 0.7 : 1,
          overflowWrap: "anywhere",
        } as any}
      >
        {sending ? (ar ? "جارٍ الإرسال..." : "Sending...") : ar ? "إرسال" : "Send"}
      </button>
    </form>
  );
}
