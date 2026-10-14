"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { reminderLogRequest } from "@/lib/api/reminder-log-request";
import styles from "./health.module.css";
import forms from "@/components-next/consult/consult.module.css";

/** Runs one request of a reminder's row and refreshes the page's data; says so in place when it fails. Same endpoints as before. */
function useReminderCall() {
  const router = useRouter();
  const t = useTranslations("HealthWeb");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  async function run(call: () => Promise<Response>, failure: string) {
    setBusy(true);
    setFailed(null);
    try {
      const res = await call();
      if (!res.ok) { setFailed(failure); return; }
      router.refresh();
    } catch {
      setFailed(failure);
    } finally {
      setBusy(false);
    }
  }
  return { busy, failed, run, t };
}

/** "Taken": logs the dose at `timeKey` (POST /api/health/reminders/:id/log, with its idempotency key). */
export function TakeDoseButton({ id, timeKey }: { id: string; timeKey?: string }) {
  const { busy, failed, run, t } = useReminderCall();
  return (
    <span className={styles.inline}>
      <Button variant="outline" size="sm" label={t("doseTake")} disabled={busy} loading={busy} onClick={() => void run(() => fetch(...reminderLogRequest(id, timeKey)), t("saveFailed"))} />
      {failed ? <span role="alert" className={forms.error}>{failed}</span> : null}
    </span>
  );
}

/** Deletes a reminder after one more press to confirm (DELETE /api/health/reminders/:id; the backend route needs an idempotency key). */
export function DeleteReminderButton({ id }: { id: string }) {
  const { busy, failed, run, t } = useReminderCall();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <Button variant="ghost" size="sm" label={t("reminderDelete")} onClick={() => setConfirming(true)} />;
  return (
    <span className={styles.inline}>
      <span className={styles.rowActions}>
        <Button variant="outline" size="sm" label={t("reminderDeleteConfirm")} disabled={busy} loading={busy} onClick={() => void run(() => fetch(`/api/health/reminders/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "idempotency-key": crypto.randomUUID() } }), t("saveFailed"))} />
        <Button variant="ghost" size="sm" label={t("cancel")} disabled={busy} onClick={() => setConfirming(false)} />
      </span>
      {failed ? <span role="alert" className={forms.error}>{failed}</span> : null}
    </span>
  );
}

/** "Request a refill": POST /api/health/reminders/:id/refill. */
export function RefillButton({ id }: { id: string }) {
  const { busy, failed, run, t } = useReminderCall();
  return (
    <span className={styles.inline}>
      <Button variant="outline" size="sm" label={t("refillRequest")} disabled={busy} loading={busy} onClick={() => void run(() => fetch(`/api/health/reminders/${encodeURIComponent(id)}/refill`, { method: "POST" }), t("refillFailed"))} />
      {failed ? <span role="alert" className={forms.error}>{failed}</span> : null}
    </span>
  );
}
