"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components-next/ui-generated/components/Button";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

type Labels = { actionsTitle:string; cancelAppointment:string; cancelConfirm:string; cancelReason:string; keepAppointment:string; confirmCancel:string; cancelConflict:string; cancelFailed:string; cancelUnavailable:string };
export function AppointmentActions({ appointmentId, labels }: { appointmentId: string; labels: Labels }) {
  const t = (key: keyof Labels) => labels[key]; const router = useRouter(); const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const key = useRef<string | null>(null);
  function start() { key.current = crypto.randomUUID(); setOpen(true); setError(null); }
  async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key.current || crypto.randomUUID() }, body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}) }); if (!response.ok) { setError(response.status === 409 ? t("cancelConflict") : t("cancelFailed")); return; } setOpen(false); router.refresh(); } catch { setError(t("cancelUnavailable")); } finally { setBusy(false); } }
  return (
    <section className={rx.card} aria-labelledby="appointment-actions-title">
      <h2 id="appointment-actions-title" className={styles.sectionTitle}>{t("actionsTitle")}</h2>
      {!open ? (
        <Button variant="danger" fullWidth label={t("cancelAppointment")} onClick={start} />
      ) : (
        <div className={styles.stack}>
          <p className={styles.body}>{t("cancelConfirm")}</p>
          <label className={styles.field}>
            <span className={styles.label}>{t("cancelReason")}</span>
            <textarea className={styles.control} rows={3} value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
          </label>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actionsRow}>
            <Button variant="outline" label={t("keepAppointment")} disabled={busy} onClick={() => setOpen(false)} />
            <Button variant="danger" label={t("confirmCancel")} loading={busy} onClick={() => void cancel()} />
          </div>
        </div>
      )}
    </section>
  );
}
