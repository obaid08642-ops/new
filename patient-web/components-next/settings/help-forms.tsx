"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import forms from "@/components-next/consult/consult.module.css";

/**
 * "Send us a request" (the form of the old `/support` page): POST /api/patient/support/requests, category GENERAL, the same
 * payload as before. On success the fields clear and the list of requests reloads.
 */
export function NewRequestForm() {
  const t = useTranslations("SettingsWeb");
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state === "loading" || !subject.trim() || !message.trim()) return;
    setState("loading");
    try {
      const response = await fetch("/api/patient/support/requests", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), category: "GENERAL" }),
      });
      if (!response.ok) throw new Error("support_request_failed");
      setSubject("");
      setMessage("");
      setState("success");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className={forms.stack} noValidate>
      <label className={forms.field}>
        <span className={forms.label}>{t("requestSubject")}</span>
        <input className={forms.control} value={subject} maxLength={160} onChange={(event) => setSubject(event.target.value)} required />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("requestMessage")}</span>
        <textarea className={forms.control} value={message} rows={4} maxLength={2000} onChange={(event) => setMessage(event.target.value)} required />
      </label>
      {state === "success" ? <p className={forms.ok} role="status">{t("requestSent")}</p> : null}
      {state === "error" ? <p className={forms.error} role="alert">{t("requestFailed")}</p> : null}
      <Button type="submit" label={t("requestSend")} loading={state === "loading"} disabled={!subject.trim() || !message.trim()} fullWidth />
    </form>
  );
}

/** The values the backend stores for a feedback type (they are the words of the old form, kept as they were sent). */
const FEEDBACK_TYPES = [
  { value: "اقتراح", key: "fbTypeSuggestion" },
  { value: "مشكلة", key: "fbTypeProblem" },
  { value: "شكوى", key: "fbTypeComplaint" },
  { value: "إطراء", key: "fbTypePraise" },
  { value: "استفسار", key: "fbTypeQuestion" },
] as const;

/** "Share your feedback" (the old `/settings/feedback`): POST /api/support/feedback with the rating, the type and the message. */
export function FeedbackForm() {
  const t = useTranslations("SettingsWeb");
  const [rating, setRating] = useState(0);
  const [type, setType] = useState<string>(FEEDBACK_TYPES[0].value);
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
        body: JSON.stringify({ rating, type, message: text.trim() }),
      });
      if (!res.ok) { setError(t("fbFailed")); return; }
      setSent(true);
    } catch {
      setError(t("fbFailed"));
    } finally {
      setSending(false);
    }
  }

  if (sent) return <p className={forms.ok} role="status">{t("fbSent")}</p>;

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
          {FEEDBACK_TYPES.map((item) => (
            <button key={item.value} type="button" className={forms.choice} aria-pressed={type === item.value} onClick={() => setType(item.value)}>
              {t(item.key)}
            </button>
          ))}
        </div>
      </div>
      <label className={forms.field}>
        <span className={forms.label}>{t("fbMessage")}</span>
        <textarea className={forms.control} value={text} rows={4} maxLength={2000} required onChange={(event) => setText(event.target.value)} />
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("fbSend")} loading={sending} fullWidth />
    </form>
  );
}
