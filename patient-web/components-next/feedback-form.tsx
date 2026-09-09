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

  if (sent) return <p role="status">{ar ? "وصل اقتراحك للإدارة وسيُطبَّق بعد الاعتماد. شكراً لك." : "Feedback received. Thank you."}</p>;

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 4 }} role="radiogroup" aria-label={ar ? "التقييم" : "Rating"}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-pressed={rating === n}>
            {n}★
          </button>
        ))}
      </div>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "النوع" : "Type"}</span>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span>{ar ? "رسالتك" : "Your message"}</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={4} required />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={sending}>{sending ? (ar ? "جارٍ الإرسال..." : "Sending...") : (ar ? "إرسال" : "Send")}</button>
    </form>
  );
}
