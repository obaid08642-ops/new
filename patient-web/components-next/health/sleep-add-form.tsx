"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import forms from "@/components-next/consult/consult.module.css";

/** Arabic-Indic and Persian digits typed on a phone keyboard become 0-9 before the number is read. */
const latin = (value: string) => value.trim().replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/**
 * Add a night of sleep (POST /api/patient/health/sleep, the call the app makes): hours slept and the quality score, both
 * checked before sending (0 to 24 hours, a score from 0 to 100). The page reloads its readings after a save.
 */
export function SleepAddForm() {
  const t = useTranslations("HealthWeb");
  const router = useRouter();
  const [hours, setHours] = useState("");
  const [score, setScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const h = Number(latin(hours).replace(",", "."));
    const s = Number(latin(score));
    if (hours.trim() === "" || !Number.isFinite(h) || h <= 0 || h > 24) { setError(t("sleepBadHours")); return; }
    if (score.trim() === "" || !Number.isInteger(s) || s < 0 || s > 100) { setError(t("sleepBadScore")); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/patient/health/sleep", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `web-sleep-${crypto.randomUUID()}` },
        body: JSON.stringify({ duration_hours: h, sleep_score: s, source: "manual" }),
        credentials: "same-origin",
      });
      if (!res.ok) { setError(t("sleepSaveError")); return; }
      setHours("");
      setScore("");
      router.refresh();
    } catch {
      setError(t("sleepSaveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={forms.stack} noValidate aria-label={t("sleepAdd")}>
      <label className={forms.field}>
        <span className={forms.label}>{t("sleepHoursField")}</span>
        <input className={forms.control} value={hours} onChange={(event) => setHours(event.target.value)} inputMode="decimal" maxLength={5} dir="ltr" />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("sleepScoreField")}</span>
        <input className={forms.control} value={score} onChange={(event) => setScore(event.target.value)} inputMode="numeric" maxLength={3} dir="ltr" />
      </label>
      <Button type="submit" variant="outline" label={t("sleepSave")} loading={saving} />
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
    </form>
  );
}
