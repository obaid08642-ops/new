"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type Labels = { comment: string; commentPh: string; submit: string; submitting: string; thanks: string; error: string };

export function PostCallRatingForm({ locale, appointmentId, labels }: { locale: string; appointmentId: string; labels: Labels }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (rating < 1 || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/patient-ux/review", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ appointment_id: appointmentId || null, rating, comment: comment.trim() || null, locale }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
    } catch { setErr(labels.error); } finally { setBusy(false); }
  }

  if (done) return <p role="status" style={{ color: "#00876F", fontWeight: 800 }}>{labels.thanks}</p>;
  const rtl = locale !== "en";
  const activeStars = hoverRating || rating;

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} style={{ display: "grid", gap: 14 }} dir={rtl ? "rtl" : "ltr"}>
      <div role="radiogroup" aria-label="rating" style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            aria-pressed={rating === n}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              transition: "transform 0.15s ease",
            }}
          >
            <Star
              size={28}
              fill={n <= activeStars ? "#FBBF24" : "none"}
              color={n <= activeStars ? "#F59E0B" : "rgba(22,33,58,0.25)"}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={labels.commentPh}
        rows={3}
        aria-label={labels.comment}
        style={{
          padding: 12,
          borderRadius: 12,
          border: "1.5px solid rgba(22,33,58,.15)",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />
      {err ? <p role="alert" style={{ color: "#DC2626" }}>{err}</p> : null}
      <button
        type="submit"
        disabled={busy || rating < 1}
        style={{
          background: "linear-gradient(135deg, #087F8C, #00876F)",
          color: "#FFFFFF",
          fontWeight: 800,
          padding: 14,
          borderRadius: 14,
          border: "none",
          cursor: busy || rating < 1 ? "not-allowed" : "pointer",
          opacity: busy || rating < 1 ? 0.6 : 1,
          boxShadow: "0 4px 12px rgba(8,127,140,0.25)",
        }}
      >
        {busy ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
