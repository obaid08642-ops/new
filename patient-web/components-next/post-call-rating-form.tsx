"use client";

import { useState } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

/** The aspects a patient can tick (the app's six); the server stores their Arabic words, as the app sends them. */
export type RatingTagId = "excellent" | "fast" | "professional" | "clean" | "helpful" | "recommend";
export const RATING_TAGS: ReadonlyArray<{ id: RatingTagId; stored: string }> = [
  { id: "excellent", stored: "ممتاز" }, // i18n-ok: the aspect as stored on the server, not shown to the user
  { id: "fast", stored: "سريع" }, // i18n-ok: stored value
  { id: "professional", stored: "احترافي" }, // i18n-ok: stored value
  { id: "clean", stored: "نظيف" }, // i18n-ok: stored value
  { id: "helpful", stored: "متعاون" }, // i18n-ok: stored value
  { id: "recommend", stored: "أنصح به" }, // i18n-ok: stored value
];

/** `star` is a template with {n}: the name of one star ("{n} of 5"), the number written for the reader's language. */
type Labels = { rating: string; star: string; comment: string; commentPh: string; submit: string; submitting: string; thanks: string; error: string; tagsTitle: string; tags: Record<RatingTagId, string> };

/**
 * The body the backend reads (patient-ux `RateDto`): the booking kind and its id, the rating, and the comment if any.
 * Nothing else: the API refuses unknown fields (forbidNonWhitelisted), so no `locale`.
 */
export function reviewBody(appointmentId: string, rating: number, comment: string, tags: ReadonlyArray<RatingTagId> = []) {
  const aspects = RATING_TAGS.filter((tag) => tags.includes(tag.id)).map((tag) => tag.stored);
  return { booking_kind: "appointment", booking_id: appointmentId, rating, comment: comment.trim() || undefined, ...(aspects.length ? { aspects } : {}) };
}

export function PostCallRatingForm({ locale, appointmentId, labels }: { locale: string; appointmentId: string; labels: Labels }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<RatingTagId[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (rating < 1 || busy) return;
    if (!appointmentId) { setErr(labels.error); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/patient-ux/review", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(reviewBody(appointmentId, rating, comment, tags)),
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
      <div role="group" aria-label={labels.tagsTitle} className={styles.slots}>
        {RATING_TAGS.map((tag) => (
          <button key={tag.id} type="button" className={styles.choice} aria-pressed={tags.includes(tag.id)} onClick={() => setTags((current) => (current.includes(tag.id) ? current.filter((x) => x !== tag.id) : [...current, tag.id]))}>{labels.tags[tag.id]}</button>
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
