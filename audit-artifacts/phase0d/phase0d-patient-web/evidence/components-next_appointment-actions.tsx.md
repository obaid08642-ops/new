# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/appointment-actions.tsx`
- **Member SHA-256:** `865a7eeebb43730b3d166723316a08798d70352fa2c0c85aedc4a93b1e22e787`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { useRouter } from "next/navigation";`
- `8: type Labels = { actionsTitle:string; cancelAppointment:string; cancelConfirm:string; cancelReason:string; keepAppointment:string; confirmCancel:string; cancelConflict:string; cancelFailed:string; cancelUnavailable:string };`
- `10: const t = (key: keyof Labels) => labels[key]; const router = useRouter(); const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = us`
- `12: async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": k`
- `13: return <section className={styles.panel} aria-labelledby="appointment-actions-title"><h2 id="appointment-actions-title">{t("actionsTitle")}</h2>{!open ? <button type="button" className={styles.cancel} onClick={start}><Ban size={17} aria-hid`
### backend_consumers_or_contracts
- `12: async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": k`
### auth_ownership
- `12: async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": k`
- `13: return <section className={styles.panel} aria-labelledby="appointment-actions-title"><h2 id="appointment-actions-title">{t("actionsTitle")}</h2>{!open ? <button type="button" className={styles.cancel} onClick={start}><Ban size={17} aria-hid`
### state_transitions
- `3: import { useRef, useState } from "react";`
- `8: type Labels = { actionsTitle:string; cancelAppointment:string; cancelConfirm:string; cancelReason:string; keepAppointment:string; confirmCancel:string; cancelConflict:string; cancelFailed:string; cancelUnavailable:string };`
- `10: const t = (key: keyof Labels) => labels[key]; const router = useRouter(); const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = us`
- `11: function start() { key.current = crypto.randomUUID(); setOpen(true); setError(null); }`
- `12: async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": k`
- `13: return <section className={styles.panel} aria-labelledby="appointment-actions-title"><h2 id="appointment-actions-title">{t("actionsTitle")}</h2>{!open ? <button type="button" className={styles.cancel} onClick={start}><Ban size={17} aria-hid`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: type Labels = { actionsTitle:string; cancelAppointment:string; cancelConfirm:string; cancelReason:string; keepAppointment:string; confirmCancel:string; cancelConflict:string; cancelFailed:string; cancelUnavailable:string };`
- `10: const t = (key: keyof Labels) => labels[key]; const router = useRouter(); const [open, setOpen] = useState(false); const [reason, setReason] = useState(""); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = us`
- `11: function start() { key.current = crypto.randomUUID(); setOpen(true); setError(null); }`
- `12: async function cancel() { if (busy) return; setBusy(true); setError(null); try { const response = await fetch(`/api/appointments/${appointmentId}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": k`
- `13: return <section className={styles.panel} aria-labelledby="appointment-actions-title"><h2 id="appointment-actions-title">{t("actionsTitle")}</h2>{!open ? <button type="button" className={styles.cancel} onClick={start}><Ban size={17} aria-hid`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
