"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { useSheetClose } from "./form-sheet";
import forms from "@/components-next/consult/consult.module.css";

export type ReminderInitial = { id?: string; name?: string; dose?: string; times?: string; frequency?: string; chronic?: boolean };

/**
 * "Add reminder" and "Edit reminder" (the old reminder form, now in a sheet): the same payload to the same endpoints
 * (POST /api/health/reminders, PATCH /api/health/reminders/:id, with an idempotency key). It closes the sheet and reloads the screen.
 */
export function ReminderForm({ initial }: { initial?: ReminderInitial }) {
  const t = useTranslations("HealthWeb");
  const router = useRouter();
  const close = useSheetClose();
  const [name, setName] = useState(initial?.name || "");
  const [dose, setDose] = useState(initial?.dose || "");
  const [times, setTimes] = useState(initial?.times || "08:00");
  const [frequency, setFrequency] = useState(initial?.frequency || "daily");
  const [chronic, setChronic] = useState(Boolean(initial?.chronic));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError(t("reminderNameRequired")); return; }
    setSaving(true);
    try {
      const url = initial?.id ? `/api/health/reminders/${encodeURIComponent(initial.id)}` : "/api/health/reminders";
      const res = await fetch(url, {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
        body: JSON.stringify({
          medicine_name_ar: name.trim(),
          time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          dose: dose.trim(),
          times: times.split(",").map((time) => time.trim()).filter(Boolean),
          frequency,
          chronic,
        }),
      });
      if (!res.ok) { setError(t("reminderSaveFailed")); return; }
      close();
      router.refresh();
    } catch {
      setError(t("reminderSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={forms.stack} noValidate>
      <label className={forms.field}>
        <span className={forms.label}>{t("reminderName")}</span>
        <input className={forms.control} value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("reminderDose")}</span>
        <input className={forms.control} value={dose} onChange={(event) => setDose(event.target.value)} maxLength={128} placeholder={t("reminderDoseHint")} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("reminderTimes")}</span>
        <input className={forms.control} value={times} onChange={(event) => setTimes(event.target.value)} maxLength={128} placeholder="08:00, 20:00" dir="ltr" />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("reminderFrequency")}</span>
        <select className={forms.control} value={frequency} onChange={(event) => setFrequency(event.target.value)}>
          <option value="daily">{t("frequency.daily")}</option>
          <option value="weekly">{t("frequency.weekly")}</option>
          <option value="as_needed">{t("frequency.as_needed")}</option>
        </select>
      </label>
      <label className={forms.pickRow}>
        <input type="checkbox" checked={chronic} onChange={(event) => setChronic(event.target.checked)} />
        <span>{t("reminderChronic")}</span>
      </label>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("reminderSave")} loading={saving} fullWidth />
    </form>
  );
}
