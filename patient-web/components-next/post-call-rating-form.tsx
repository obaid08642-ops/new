"use client";

import { useState } from "react";

type Labels = { comment: string; commentPh: string; submit: string; submitting: string; thanks: string; error: string };

export function PostCallRatingForm({ locale, appointmentId, labels }: { locale: string; appointmentId: string; labels: Labels }) {
  const [rating, setRating] = useState(0);
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

  if (done) return <p role="status" style={{ color: "#7CB518", fontWeight: 800 }}>{labels.thanks}</p>;
  const rtl = locale !== "en";
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} style={{ display: "grid", gap: 14 }} dir={rtl ? "rtl" : "ltr"}>
      <div role="radiogroup" aria-label="rating" style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-pressed={rating === n}
            style={{ fontSize: 30, background: "none", border: "none", cursor: "pointer", color: n <= rating ? "#FFC93C" : "rgba(22,33,58,.25)" }}>★</button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={labels.commentPh} rows={3} aria-label={labels.comment}
        style={{ padding: 12, borderRadius: 12, border: "1.5px solid rgba(22,33,58,.15)", resize: "vertical" }} />
      {err ? <p role="alert" style={{ color: "#FF4D5A" }}>{err}</p> : null}
      <button type="submit" disabled={busy || rating < 1}
        style={{ background: "#B8E030", color: "#16213A", fontWeight: 800, padding: 14, borderRadius: 14, border: "none", cursor: "pointer", opacity: busy || rating < 1 ? .6 : 1 }}>
        {busy ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}
