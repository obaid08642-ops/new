"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { FIcon } from "@/components-next/ui-generated/components/FIcon";
import { SERVICE_ICONS } from "@/components-next/ui-generated/icons/fill";
import { ConfirmDialog } from "@/components-next/confirm/confirm-dialog";
import rx from "@/components-next/pharmacy/rx.module.css";
import forms from "@/components-next/consult/consult.module.css";

export const CALENDAR_TYPES = ["appointment", "reminder", "medication", "lab"] as const;

/** The form of the app's "+" sheet: title, date and time, member, type (POST /api/family/calendar/event). */
export function AddEventForm({ members, doneHref }: { members: Array<{ id: string; name: string }>; doneHref: string }) {
  const t = useTranslations("FamilyWeb");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const date = new Date(when);
    if (!title.trim() || !when || Number.isNaN(date.getTime()) || !memberId || !type) { setError(t("calendarInvalid")); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/family/calendar/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title.trim(), event_date: date.toISOString(), member_user_id: memberId, type }),
      });
      if (!res.ok) { setError(t("calendarAddFailed")); return; }
      router.replace(doneHref);
      router.refresh();
    } catch {
      setError(t("calendarAddFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className={forms.stack} noValidate>
      <label className={forms.field}>
        <span className={forms.label}>{t("calendarEventTitle")}</span>
        <input className={forms.control} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      </label>
      <label className={forms.field}>
        <span className={forms.label}>{t("calendarEventDate")}</span>
        <input className={forms.control} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </label>
      <div className={forms.field} role="group" aria-label={t("calendarMember")}>
        <span className={forms.label}>{t("calendarMember")}</span>
        <div className={forms.choices}>
          {members.map((m) => (
            <button key={m.id} type="button" className={forms.choice} aria-pressed={memberId === m.id} onClick={() => setMemberId(m.id)}>{m.name}</button>
          ))}
        </div>
      </div>
      <div className={forms.field} role="group" aria-label={t("calendarEventType")}>
        <span className={forms.label}>{t("calendarEventType")}</span>
        <div className={forms.choices}>
          {CALENDAR_TYPES.map((key) => (
            <button key={key} type="button" className={forms.choice} aria-pressed={type === key} onClick={() => setType(key)}>{t(`calendarType.${key}`)}</button>
          ))}
        </div>
      </div>
      {error ? <p className={forms.error} role="alert">{error}</p> : null}
      <Button type="submit" label={t("calendarSave")} size="lg" fullWidth loading={saving} />
    </form>
  );
}

/** The trash button of an event the person may delete, with the app's confirmation (DELETE /api/family/calendar/event/:id). */
export function DeleteEventButton({ eventId }: { eventId: string }) {
  const t = useTranslations("FamilyWeb");
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/family/calendar/event/${encodeURIComponent(eventId)}`, { method: "DELETE" });
      if (!res.ok) { setFailed(true); setConfirming(false); return; }
      setConfirming(false);
      router.refresh();
    } catch {
      setFailed(true);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="nabd-icon-button nabd-icon-button--md nabd-icon-button--circle nabd-icon-button--tone-neutral" aria-label={t("calendarDelete")} onClick={() => setConfirming(true)}>
        <FIcon icon="trash" tone={SERVICE_ICONS.family.tone} size={32} chip="none" />
      </button>
      {failed ? <span className={`${forms.error} ${rx.note}`} role="alert">{t("calendarDeleteFailed")}</span> : null}
      <ConfirmDialog
        open={confirming}
        title={t("calendarDeleteTitle")}
        body={t("calendarDeleteBody")}
        confirmLabel={t("calendarDelete")}
        cancelLabel={t("cancel")}
        destructive
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
