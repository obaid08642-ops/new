"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components-next/ui-generated/components/Button";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

type Labels = { title:string; date:string; reason:string; submit:string; cancel:string; conflict:string; failed:string; unavailable:string; invalid:string };
export function AppointmentRescheduleForm({ appointmentId, labels }: { appointmentId:string; labels:Labels }) {
  const router=useRouter(); const [open,setOpen]=useState(false); const [scheduledAt,setScheduledAt]=useState(""); const [reason,setReason]=useState(""); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false); const key=useRef<string|null>(null);
  const min=new Date(Date.now()+60_000).toISOString().slice(0,16);
  function start(){ key.current=crypto.randomUUID(); setOpen(true); setError(null); }
  async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/reschedule`,{method:"PATCH",headers:{"content-type":"application/json","idempotency-key":key.current||crypto.randomUUID()},body:JSON.stringify({scheduled_at:new Date(scheduledAt).toISOString(),...(reason.trim()?{reason:reason.trim()}: {})})});if(!response.ok){setError(response.status===409?labels.conflict:labels.failed);return;}setOpen(false);router.refresh();}catch{setError(labels.unavailable)}finally{setBusy(false)}}
  return (
    <section className={rx.card} aria-labelledby="reschedule-title">
      <h2 id="reschedule-title" className={styles.sectionTitle}>{labels.title}</h2>
      {!open ? (
        <Button variant="outline" fullWidth label={labels.submit} onClick={start} />
      ) : (
        <div className={styles.stack}>
          <label className={styles.field}>
            <span className={styles.label}>{labels.date}</span>
            <input className={styles.control} type="datetime-local" min={min} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{labels.reason}</span>
            <textarea className={styles.control} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.actionsRow}>
            <Button variant="outline" label={labels.cancel} disabled={busy} onClick={() => setOpen(false)} />
            <Button label={labels.submit} loading={busy} onClick={() => void submit()} />
          </div>
        </div>
      )}
    </section>
  );
}
