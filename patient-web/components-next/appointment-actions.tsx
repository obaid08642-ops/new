"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, LoaderCircle } from "lucide-react";
import styles from "./appointment-actions.module.css";

type Labels = { actionsTitle:string; cancelAppointment:string; cancelConfirm:string; cancelReason:string; keepAppointment:string; confirmCancel:string; cancelConflict:string; cancelFailed:string; cancelUnavailable:string };
export function AppointmentActions({ appointmentId, labels }: { appointmentId: string; labels: Labels }) {
  const t = (key: keyof Labels) => labels[key]; const router = useRouter(); const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false); const key = useRef<string | null>(null);
  function start() { key.current = crypto.randomUUID(); setOpen(true); setError(null); }
  async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key.current || crypto.randomUUID() }, body: JSON.stringify(reason.trim() ? { reason: reason.trim() } : {}) }); if (!response.ok) { setError(response.status === 409 ? t("cancelConflict") : t("cancelFailed")); return; } setOpen(false); router.refresh(); } catch { setError(t("cancelUnavailable")); } finally { setBusy(false); } }
  return <section className={styles.panel} aria-labelledby="appointment-actions-title"><h2 id="appointment-actions-title">{t("actionsTitle")}</h2>{!open ? <button type="button" className={styles.cancel} onClick={start}><Ban size={17} aria-hidden="true" />{t("cancelAppointment")}</button> : <div className={styles.confirm}><p>{t("cancelConfirm")}</p><label><span>{t("cancelReason")}</span><textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} /></label>{error ? <p className={styles.error} role="alert">{error}</p> : null}<div className={styles.row}><button type="button" className={styles.secondary} onClick={() => setOpen(false)} disabled={busy}>{t("keepAppointment")}</button><button type="button" className={styles.cancel} onClick={cancel} disabled={busy}>{busy ? <LoaderCircle className={styles.spinner} size={17} aria-hidden="true" /> : <Ban size={17} aria-hidden="true" />}{t("confirmCancel")}</button></div></div>}</section>;
}
