"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components-next/ui-generated/components/Button";
import { formatPrice } from "@/lib/format-price";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

/** The reasons a patient can pick (the app's six); the server stores the Arabic text of the chosen one, as the app sends it. */
export type CancelReasonId = "emergency" | "better" | "otherDoctor" | "time" | "payment" | "other";
export const CANCEL_REASONS: ReadonlyArray<{ id: CancelReasonId; stored: string }> = [
  { id: "emergency", stored: "ارتباط طارئ" }, // i18n-ok: the reason as stored on the server, not shown to the user
  { id: "better", stored: "تحسّنت صحتي" }, // i18n-ok: stored value
  { id: "otherDoctor", stored: "أريد تغيير الطبيب" }, // i18n-ok: stored value
  { id: "time", stored: "الوقت لا يناسبني" }, // i18n-ok: stored value
  { id: "payment", stored: "مشكلة في الدفع" }, // i18n-ok: stored value
  { id: "other", stored: "سبب آخر" }, // i18n-ok: stored value
];
type Labels = { actionsTitle:string; cancelAppointment:string; cancelConfirm:string; cancelReason:string; keepAppointment:string; confirmCancel:string; cancelConflict:string; cancelFailed:string; cancelUnavailable:string; myAppointments:string; reasonTitle:string; reasons: Record<CancelReasonId, string> };
type Refund = { paid: boolean; percent: number; amount: number };
/** journeys#44: after cancelling, what comes back. `refunded` is the message template with {amount} and {percent}. */
export type RefundText = { refunded: string; noRefund: string; notCharged: string };
export function cancelledMessage(refund: Refund | null | undefined, text: RefundText, locale: string): string | null {
  if (!refund) return null;
  if (!refund.paid) return text.notCharged;
  if (refund.amount <= 0) return text.noRefund;
  const money = formatPrice(locale, refund.amount).text;
  return text.refunded.replace("{amount}", money).replace("{percent}", new Intl.NumberFormat(locale).format(refund.percent));
}
export function AppointmentActions({ appointmentId, labels, refundText, locale }: { appointmentId: string; labels: Labels; refundText?: RefundText; locale?: string }) {
  const t = (key: Exclude<keyof Labels, "reasons">) => labels[key]; const router = useRouter(); const [open, setOpen] = useState(false); const [reasonId, setReasonId] = useState<CancelReasonId | "">(""); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [done, setDone] = useState<string | null>(null); const [cancelled, setCancelled] = useState(false); const key = useRef<string | null>(null);
  function start() { key.current = crypto.randomUUID(); setOpen(true); setError(null); }
  async function cancel() { if (busy || !reasonId) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key.current || crypto.randomUUID() }, body: JSON.stringify({ reason: CANCEL_REASONS.find((r) => r.id === reasonId)?.stored ?? "" }) }); if (!response.ok) { setError(response.status === 409 ? t("cancelConflict") : t("cancelFailed")); return; } const body = await response.json().catch(() => null) as { refund?: Refund | null } | null; setOpen(false); setCancelled(true); setDone(refundText ? cancelledMessage(body?.refund, refundText, locale || "ar") : null); router.refresh(); } catch { setError(t("cancelUnavailable")); } finally { setBusy(false); } }
  return (
    <section className={rx.card} aria-labelledby="appointment-actions-title">
      <h2 id="appointment-actions-title" className={styles.sectionTitle}>{t("actionsTitle")}</h2>
      {done !== null || cancelled ? <><p className={styles.ok} role="status">{done}</p><Link className={rx.textLink} href={`/${locale || "ar"}/appointments`}>{t("myAppointments")}</Link></> : !open ? (
        <Button variant="danger" fullWidth label={t("cancelAppointment")} onClick={start} />
      ) : (
        <div className={styles.stack}>
          <p className={styles.body}>{t("cancelConfirm")}</p>
          <div role="group" aria-label={t("reasonTitle")} className={styles.stack}>
            <span className={styles.label}>{t("reasonTitle")}</span>
            {CANCEL_REASONS.map((r) => (
              <button key={r.id} type="button" className={styles.choice} aria-pressed={reasonId === r.id} onClick={() => setReasonId(r.id)}>{labels.reasons[r.id]}</button>
            ))}
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actionsRow}>
            <Button variant="outline" label={t("keepAppointment")} disabled={busy} onClick={() => setOpen(false)} />
            <Button variant="danger" label={t("confirmCancel")} loading={busy} disabled={!reasonId} onClick={() => void cancel()} />
          </div>
        </div>
      )}
    </section>
  );
}
