"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import forms from "@/components-next/consult/consult.module.css";

/** The five kinds of the app's feedback screen; the key is what the backend stores as `category`. */
const FEEDBACK_KINDS = [
  { value: "suggestion", key: "fbTypeSuggestion" },
  { value: "issue", key: "fbTypeProblem" },
  { value: "complaint", key: "fbTypeComplaint" },
  { value: "praise", key: "fbTypePraise" },
  { value: "question", key: "fbTypeQuestion" },
] as const;

/** The stars the form shows become the three ratings the server knows (the app's rule). */
export const ratingOf = (stars: number): "positive" | "neutral" | "negative" | undefined =>
  stars <= 0 ? undefined : stars >= 4 ? "positive" : stars === 3 ? "neutral" : "negative";

/** "Share your feedback" (the help screen's second tab): POST /api/support/feedback with the same payload as the app: message, rating (positive, neutral, negative) and category. */
export function FeedbackForm({ doneHref }: { doneHref: string }) {
  const t = useTranslations("SettingsWeb");
  const [rating, setRating] = useState(0);
  const [kind, setKind] = useState<string>("");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!text.trim()) { setError(t("fbEmpty")); return; }
    setSending(true);
    try {
      const res = await fetch("/api/support/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text.trim(), ...(ratingOf(rating) ? { rating: ratingOf(rating) } : {}), ...(kind ? { category: kind } : {}) }),
      });
      if (!res.ok) { setError(t("fbFailed")); return; }
      setSent(true);
    } catch {
      setError(t("fbFailed"));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className={forms.stack} role="status">
        <p className={forms.ok}><strong>{t("fbThanks")}</strong></p>
        <p className={forms.body}>{t("fbThanksBody")}</p>
        <ButtonLink href={doneHref} label={t("fbBack")} fullWidth />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={forms.stack} noValidate>
      <div className={forms.field}>
        <span className={forms.label} id="fb-rating">{t("fbRating")}</span>
        <div className={forms.choices} role="group" aria-labelledby="fb-rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={forms.choice} aria-pressed={rating === n} aria-label={t("fbStars", { count: n })} onClick={() => setRating(n)}>
              <bdi>{n}</bdi>
            </button>
          ))}
        </div>
      </div>
      <div className={forms.field}>
        <span className={forms.label} id="fb-type">{t("fbType")}</span>
        <div className={forms.choices} role="group" aria-labelledby="fb-type">
          {FEEDBACK_KINDS.map((item) => (
            <button key={item.value} type="button" className={forms.choice} aria-pressed={kind === item.value} onClick={() => setKind(kind === item.value ? "" : item.value)}>
              {t(item.key)}
            </button>
          ))}
        </div>
      </div>
      <label className={forms.field}>
        <span className={forms.label}>{t("fbMessage")}</span>
        <textarea className={forms.control} value={text} rows={4} maxLength={2000} placeholder={t("fbPlaceholder")} required onChange={(event) => setText(event.target.value)} />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("fbSend")} loading={sending} fullWidth />
    </form>
  );
}
