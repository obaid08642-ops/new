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
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} style={{ display: "grid", gap: 16 }} dir={rtl ? "rtl" : "ltr"}>
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
              color={n <= activeStars ? "#F59E0B" : "rgba(30,51,46,0.25)"}
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
          padding: 16,
          borderRadius: 16,
          border: "1px solid #E8EDEE",
          background: "#FFFFFF",
          color: "#1E332E",
          resize: "vertical",
          fontFamily: "inherit",
          fontSize: 14,
          lineHeight: "1.6",
          overflowWrap: "anywhere",
        }}
      />
      {err ? <p role="alert" style={{ color: "#DC2626", overflowWrap: "anywhere" }}>{err}</p> : null}
      <button
        type="submit"
        disabled={busy || rating < 1}
        style={{
          background: "#5FD9B3",
          color: "#1E332E",
          fontWeight: 800,
          padding: 14,
          borderRadius: 16,
          border: "1px solid #5FD9B3",
          cursor: busy || rating < 1 ? "not-allowed" : "pointer",
          opacity: busy || rating < 1 ? 0.6 : 1,
          boxShadow: "0 4px 12px rgba(30,51,46,0.12)",
          overflowWrap: "anywhere",
        }}
      >
        {busy ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
