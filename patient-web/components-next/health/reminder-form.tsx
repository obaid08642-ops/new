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
/**
 * Journeys 67: `members` (the family members the caregiver may manage) adds a "for whom" choice to a new reminder;
 * `forMember` writes this reminder for that member (the member page). The server checks the family right.
 */
export function ReminderForm({ initial, members, forMember }: { initial?: ReminderInitial; members?: Array<{ id: string; name: string }>; forMember?: { id: string; name: string } }) {
  const t = useTranslations("HealthWeb");
  const router = useRouter();
  const close = useSheetClose();
  const [name, setName] = useState(initial?.name || "");
  const [dose, setDose] = useState(initial?.dose || "");
  const [times, setTimes] = useState<string[]>(() => {
    const parsed = (initial?.times || "08:00").split(",").map((time) => time.trim()).filter(Boolean);
    return parsed.length > 0 ? parsed : ["08:00"];
  });
  const [frequency, setFrequency] = useState(initial?.frequency || "daily");
  const [chronic, setChronic] = useState(Boolean(initial?.chronic));
  const [memberId, setMemberId] = useState(forMember?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (name.trim().length < 2) { setError(t("reminderNameRequired")); return; }
    const chosenTimes = times.map((time) => time.trim()).filter(Boolean);
    if (chosenTimes.length === 0) { setError(t("reminderTimeRequired")); return; }
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
          times: [...new Set(chosenTimes)],
          frequency,
          chronic,
          ...(memberId ? { for_member_id: memberId } : {}),
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
      {forMember ? <p className={forms.label}>{t("reminderForName", { name: forMember.name })}</p> : !initial?.id && members && members.length > 0 ? (
        <label className={forms.field}>
          <span className={forms.label}>{t("reminderFor")}</span>
          <select className={forms.control} value={memberId} onChange={(event) => setMemberId(event.target.value)}>
            <option value="">{t("reminderForMe")}</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
      ) : null}
      <label className={forms.field}>
        <span className={forms.label}>{t("reminderName")}</span>
        <input className={forms.control} value={name} onChange={(event) => setName(event.target.value)} required maxLength={200} />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("reminderDose")}</span>
        <input className={forms.control} value={dose} onChange={(event) => setDose(event.target.value)} maxLength={128} placeholder={t("reminderDoseHint")} />
      </label>
      <fieldset className={forms.field}>
        <legend className={forms.label}>{t("reminderTimes")}</legend>
        {times.map((time, index) => (
          <div key={index} className={forms.actionsRow}>
            <input
              className={forms.control}
              type="time"
              value={time}
              required
              dir="ltr"
              aria-label={t("reminderTimeN", { n: index + 1 })}
              onChange={(event) => setTimes((current) => current.map((item, i) => (i === index ? event.target.value : item)))}
            />
            {times.length > 1 ? <Button type="button" variant="outline" label={t("reminderRemoveTime")} onClick={() => setTimes((current) => current.filter((_, i) => i !== index))} /> : null}
          </div>
        ))}
        {times.length < 6 ? <Button type="button" variant="outline" label={t("reminderAddTime")} onClick={() => setTimes((current) => [...current, "12:00"])} /> : null}
      </fieldset>
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
