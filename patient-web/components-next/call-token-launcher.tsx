"use client";

import { useState } from "react";
import { Video, LoaderCircle, ShieldCheck } from "lucide-react";
import styles from "./call-token-launcher.module.css";

type Labels = { title:string; join:string; loading:string; ready:string; unavailable:string; notReady:string };
type CallCredential = { provider:"livekit"; token:string; room:string };
export function CallTokenLauncher({ appointmentId, labels }: { appointmentId:string; labels:Labels }) {
  const [state,setState]=useState<"idle"|"loading"|"ready"|"error">("idle"); const [credential,setCredential]=useState<CallCredential|null>(null); const [error,setError]=useState<string|null>(null);
  async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"no-store",credentials:"same-origin"});const data=await response.json().catch(()=>null);if(!response.ok||!data?.token||data.provider!=="livekit"||!data.room){setState("error");setError(response.status===409?labels.notReady:labels.unavailable);return;}setCredential({provider:"livekit",token:data.token,room:data.room});setState("ready");}catch{setState("error");setError(labels.unavailable)}}
  function discard(){setCredential(null);setState("idle");setError(null)}
  return <section className={styles.panel} aria-labelledby="call-token-title"><div className={styles.heading}><ShieldCheck size={17} aria-hidden="true"/><h2 id="call-token-title">{labels.title}</h2></div>{state==="ready"&&credential?<div className={styles.ready}><p>{labels.ready}</p><button type="button" className={styles.secondary} onClick={discard}>{labels.notReady}</button></div>:<button type="button" className={styles.primary} onClick={requestToken} disabled={state==="loading"}>{state==="loading"?<LoaderCircle className={styles.spinner} size={17} aria-hidden="true"/>:<Video size={17} aria-hidden="true"/>}{state==="loading"?labels.loading:labels.join}</button>}{error?<p className={styles.error} role="alert">{error}</p>:null}</section>;
}
