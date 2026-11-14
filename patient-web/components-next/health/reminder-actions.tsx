"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
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
      <span className={styles.rowActions}>
        <Button variant="outline" size="sm" label={t("doseTake")} disabled={busy} loading={busy} onClick={() => void run(() => fetch(...reminderLogRequest(id, timeKey)), t("saveFailed"))} />
        <Button variant="ghost" size="sm" label={t("doseSkip")} disabled={busy} onClick={() => void run(() => fetch(...reminderLogRequest(id, timeKey, crypto.randomUUID(), "skipped")), t("saveFailed"))} />
      </span>
      {failed ? <span role="alert" className={forms.error}>{failed}</span> : null}
    </span>
  );
}

/** "Stop reminder": deactivates it (PATCH /api/health/reminders/:id {active:false}, as the app) after one more press to confirm. */
export function StopReminderButton({ id }: { id: string }) {
  const { busy, failed, run, t } = useReminderCall();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <Button variant="ghost" size="sm" label={t("reminderStop")} onClick={() => setConfirming(true)} />;
  return (
    <span className={styles.inline}>
      <span className={styles.rowActions}>
        <Button variant="outline" size="sm" label={t("confirmAction")} disabled={busy} loading={busy} onClick={() => void run(() => fetch(`/api/health/reminders/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ active: false }) }), t("saveFailed"))} />
        <Button variant="ghost" size="sm" label={t("cancel")} disabled={busy} onClick={() => setConfirming(false)} />
      </span>
      {failed ? <span role="alert" className={forms.error}>{failed}</span> : null}
    </span>
  );
}

/** The pharmacy order a refill made, from the answer of POST .../refill (only a server-created order, as the app's refillTrackingParams). */
export function refillOrderId(response: unknown): string | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) return null;
  const { ok, order_id: orderId } = response as { ok?: unknown; order_id?: unknown };
  return ok === true && typeof orderId === "string" && orderId.trim() ? orderId.trim() : null;
}

/**
 * "Request a refill": asks first, sends POST /api/health/reminders/:id/refill, then says it went (with a link to track the
 * order when the server made one) or why not; a missing delivery address links to the address book, as the app does.
 */
export function RefillButton({ id, trackBase, addressHref }: { id: string; trackBase: string; addressHref: string }) {
  const { busy, failed, run, t } = useReminderCall();
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState<{ orderId: string | null } | null>(null);
  const [needsAddress, setNeedsAddress] = useState(false);
  if (sent) {
    return (
      <span className={styles.inline}>
        <span role="status" className={forms.ok}>{t("refillSent")}</span>
        {sent.orderId ? <ButtonLink href={`${trackBase}?orderId=${encodeURIComponent(sent.orderId)}`} label={t("refillTrack")} variant="outline" size="sm" /> : null}
      </span>
    );
  }
  if (!confirming) return <Button variant="outline" size="sm" label={t("refillRequest")} onClick={() => setConfirming(true)} />;
  async function send() {
    setNeedsAddress(false);
    await run(async () => {
      const res = await fetch(`/api/health/reminders/${encodeURIComponent(id)}/refill`, { method: "POST" });
      const body: unknown = await res.clone().json().catch(() => null);
      if (res.ok) setSent({ orderId: refillOrderId(body) });
      else if (/no_default_address/.test(JSON.stringify(body))) setNeedsAddress(true);
      return res;
    }, t("refillFailed"));
  }
  return (
    <span className={styles.inline}>
      <span className={styles.rowActions}>
        <Button variant="outline" size="sm" label={t("refillConfirm")} disabled={busy} loading={busy} onClick={() => void send()} />
        <Button variant="ghost" size="sm" label={t("cancel")} disabled={busy} onClick={() => setConfirming(false)} />
      </span>
      {needsAddress ? <span role="alert" className={forms.error}>{t("refillNoAddress")} <ButtonLink href={addressHref} label={t("refillAddAddress")} variant="ghost" size="sm" /></span> : failed ? <span role="alert" className={forms.error}>{failed}</span> : null}
    </span>
  );
}

/** The chronic tab's actions (as the app): start a refill, defer the follow-up by three days, stop refill tracking. */
export function ChronicActions({ id, soon, trackBase, addressHref }: { id: string; soon: boolean; trackBase: string; addressHref: string }) {
  const { busy, failed, run, t } = useReminderCall();
  const [confirmStop, setConfirmStop] = useState(false);
  return (
    <span className={styles.inline}>
      {soon ? <RefillButton id={id} trackBase={trackBase} addressHref={addressHref} /> : null}
      <span className={styles.rowActions}>
        <Button variant="outline" size="sm" label={t("chronicDefer")} disabled={busy} onClick={() => void run(() => fetch(`/api/health/reminders/${encodeURIComponent(id)}/refill/snooze`, { method: "POST" }), t("chronicUpdateFailed"))} />
        {confirmStop ? (
          <>
            <Button variant="outline" size="sm" label={t("confirmAction")} disabled={busy} loading={busy} onClick={() => void run(() => fetch(`/api/health/reminders/${encodeURIComponent(id)}/refill/cancel`, { method: "POST" }), t("chronicUpdateFailed"))} />
            <Button variant="ghost" size="sm" label={t("cancel")} disabled={busy} onClick={() => setConfirmStop(false)} />
          </>
        ) : <Button variant="ghost" size="sm" label={t("chronicStop")} onClick={() => setConfirmStop(true)} />}
      </span>
      {failed ? <span role="alert" className={forms.error}>{failed}</span> : null}
    </span>
  );
}
