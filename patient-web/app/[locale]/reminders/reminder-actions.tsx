"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { reminderLogRequest } from "@/lib/api/reminder-log-request";
import { useOptimisticAction } from "@/lib/api/use-optimistic-action";

/**
 * F69: per-reminder actions (same endpoints as the app).
 * P15.3: marking a dose taken is SAFE-optimistic — the ✓ appears instantly and
 * is rolled back with an explaining toast when the POST fails.
 */
export function ReminderActions({ locale, id, nextTimeKey }: { locale: string; id: string; nextTimeKey?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [taken, setTaken] = useState(false);
  const { run: runDose, pending: dosePending } = useOptimisticAction<Response>();

  const logTaken = () => {
    if (dosePending) return;
    setFailed(false);
    void runDose("reminder", {
      apply: () => setTaken(true),
      rollback: () => {
        setTaken(false);
        setFailed(true);
      },
      commit: async () => {
        const res = await fetch(...reminderLogRequest(id, nextTimeKey));
        if (!res.ok) throw new Error(`reminder_log_${res.status}`);
        return res;
      },
      onCommitted: () => router.refresh(),
    });
  };

  const remove = async () => {
    if (!window.confirm(locale === "ar" ? "حذف هذا التذكير؟" : "Delete this reminder?")) return;
    setBusy(true); setFailed(false);
    try {
      // The backend DELETE is @RequireIdempotency too: without a key every delete answered 400 (Q11).
      const res = await fetch(`/api/health/reminders/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "idempotency-key": crypto.randomUUID() } });
      if (!res.ok) { setFailed(true); return; }
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: "flex", gap: 8 }}>
      <button type="button" onClick={logTaken} disabled={busy || dosePending} aria-label={locale === "ar" ? "تم أخذ الجرعة" : "Mark dose taken"}>{taken ? "✔" : "✓"}</button>
      <Link href={`/${locale}/reminders/add?edit=${encodeURIComponent(id)}`}>✎</Link>
      <button type="button" onClick={() => void remove()} disabled={busy || dosePending} aria-label={locale === "ar" ? "حذف التذكير" : "Delete reminder"}>×</button>
      {failed ? <span role="alert">{locale === "ar" ? "تعذّر الحفظ، حاول مرة أخرى" : "Could not save, try again"}</span> : null}
    </span>
  );
}
