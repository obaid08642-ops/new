"use client";

import { useState } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

/** `star` is a template with {n}: the name of one star ("{n} of 5"), the number written for the reader's language. */
type Labels = { rating: string; star: string; comment: string; commentPh: string; submit: string; submitting: string; thanks: string; error: string };

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

  if (done) return <p className={styles.ok} role="status">{labels.thanks}</p>;
  const activeStars = hoverRating || rating;
  const number = new Intl.NumberFormat(locale);

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className={rx.card}>
      <div role="radiogroup" aria-label={labels.rating} className={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={labels.star.replace("{n}", number.format(n))}
            data-on={n <= activeStars ? "true" : "false"}
            className={styles.star}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <FIcon icon="star" tone="amber" size={36} chip="none" />
          </button>
        ))}
      </div>
      <label className={styles.field}>
        <span className={styles.label}>{labels.comment}</span>
        <textarea className={styles.control} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={labels.commentPh} rows={4} />
      </label>
      {err ? <p className={styles.error} role="alert">{err}</p> : null}
      <Button type="submit" fullWidth label={busy ? labels.submitting : labels.submit} loading={busy} disabled={rating < 1} />
    </form>
  );
}
