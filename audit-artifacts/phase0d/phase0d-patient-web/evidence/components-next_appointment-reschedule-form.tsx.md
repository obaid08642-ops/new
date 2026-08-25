# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/appointment-reschedule-form.tsx`
- **Member SHA-256:** `da015ddbca7e7d995a4b16c616db7b4888ce81ae81cc37148f7f334a3f73c0ff`
- **Line count:** 15
- **Read range:** `1-15`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: import { useRouter } from "next/navigation";`
- `6: import styles from "./appointment-reschedule-form.module.css";`
- `8: type Labels = { title:string; date:string; reason:string; submit:string; cancel:string; conflict:string; failed:string; unavailable:string; invalid:string };`
- `9: export function AppointmentRescheduleForm({ appointmentId, labels }: { appointmentId:string; labels:Labels }) {`
- `10: const router=useRouter(); const [open,setOpen]=useState(false); const [scheduledAt,setScheduledAt]=useState(""); const [reason,setReason]=useState(""); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false)`
- `13: async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/reschedule`,{method:"PATCH",headers:{"content-type":`
- `14: return <section className={styles.panel} aria-labelledby="reschedule-title"><h2 id="reschedule-title">{labels.title}</h2>{!open?<button type="button" className={styles.open} onClick={start}><CalendarClock size={17} aria-hidden="true"/>{labe`
### backend_consumers_or_contracts
- `13: async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/reschedule`,{method:"PATCH",headers:{"content-type":`
### auth_ownership
- `13: async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/reschedule`,{method:"PATCH",headers:{"content-type":`
- `14: return <section className={styles.panel} aria-labelledby="reschedule-title"><h2 id="reschedule-title">{labels.title}</h2>{!open?<button type="button" className={styles.open} onClick={start}><CalendarClock size={17} aria-hidden="true"/>{labe`
### state_transitions
- `3: import { useRef, useState } from "react";`
- `8: type Labels = { title:string; date:string; reason:string; submit:string; cancel:string; conflict:string; failed:string; unavailable:string; invalid:string };`
- `10: const router=useRouter(); const [open,setOpen]=useState(false); const [scheduledAt,setScheduledAt]=useState(""); const [reason,setReason]=useState(""); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false)`
- `12: function start(){ key.current=crypto.randomUUID(); setOpen(true); setError(null); }`
- `13: async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/reschedule`,{method:"PATCH",headers:{"content-type":`
- `14: return <section className={styles.panel} aria-labelledby="reschedule-title"><h2 id="reschedule-title">{labels.title}</h2>{!open?<button type="button" className={styles.open} onClick={start}><CalendarClock size={17} aria-hidden="true"/>{labe`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: type Labels = { title:string; date:string; reason:string; submit:string; cancel:string; conflict:string; failed:string; unavailable:string; invalid:string };`
- `10: const router=useRouter(); const [open,setOpen]=useState(false); const [scheduledAt,setScheduledAt]=useState(""); const [reason,setReason]=useState(""); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false)`
- `12: function start(){ key.current=crypto.randomUUID(); setOpen(true); setError(null); }`
- `13: async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/reschedule`,{method:"PATCH",headers:{"content-type":`
- `14: return <section className={styles.panel} aria-labelledby="reschedule-title"><h2 id="reschedule-title">{labels.title}</h2>{!open?<button type="button" className={styles.open} onClick={start}><CalendarClock size={17} aria-hidden="true"/>{labe`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
