"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, LoaderCircle } from "lucide-react";
import styles from "./appointment-reschedule-form.module.css";

type Labels = { title:string; date:string; reason:string; submit:string; cancel:string; conflict:string; failed:string; unavailable:string; invalid:string };
export function AppointmentRescheduleForm({ appointmentId, labels }: { appointmentId:string; labels:Labels }) {
  const router=useRouter(); const [open,setOpen]=useState(false); const [scheduledAt,setScheduledAt]=useState(""); const [reason,setReason]=useState(""); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false); const key=useRef<string|null>(null);
  const min=new Date(Date.now()+60_000).toISOString().slice(0,16);
  function start(){ key.current=crypto.randomUUID(); setOpen(true); setError(null); }
  async function submit(){ if(busy)return; if(!scheduledAt){setError(labels.invalid);return;} setBusy(true);setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/reschedule`,{method:"PATCH",headers:{"content-type":"application/json","idempotency-key":key.current||crypto.randomUUID()},body:JSON.stringify({scheduled_at:new Date(scheduledAt).toISOString(),...(reason.trim()?{reason:reason.trim()}: {})})});if(!response.ok){setError(response.status===409?labels.conflict:labels.failed);return;}setOpen(false);router.refresh();}catch{setError(labels.unavailable)}finally{setBusy(false)}}
  return <section className={styles.panel} aria-labelledby="reschedule-title"><h2 id="reschedule-title">{labels.title}</h2>{!open?<button type="button" className={styles.open} onClick={start}><CalendarClock size={17} aria-hidden="true"/>{labels.submit}</button>:<div className={styles.form}><label><span>{labels.date}</span><input type="datetime-local" min={min} value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} /></label><label><span>{labels.reason}</span><textarea maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} /></label>{error?<p className={styles.error} role="alert">{error}</p>:null}<div className={styles.row}><button type="button" className={styles.secondary} disabled={busy} onClick={()=>setOpen(false)}>{labels.cancel}</button><button type="button" className={styles.open} disabled={busy} onClick={submit}>{busy?<LoaderCircle className={styles.spinner} size={17} aria-hidden="true"/>:<CalendarClock size={17} aria-hidden="true"/>}{labels.submit}</button></div></div>}</section>;
}
