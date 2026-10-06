"use client";

import { useState } from "react";
import { Button } from "@/components-next/ui-generated/components/Button";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";

type Labels = { title:string; join:string; loading:string; ready:string; unavailable:string; notReady:string };
type CallCredential = { provider:"livekit"; token:string; room:string };
export function CallTokenLauncher({ appointmentId, labels }: { appointmentId:string; labels:Labels }) {
  const [state,setState]=useState<"idle"|"loading"|"ready"|"error">("idle"); const [credential,setCredential]=useState<CallCredential|null>(null); const [error,setError]=useState<string|null>(null);
  async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"no-store",credentials:"same-origin"});const data=await response.json().catch(()=>null);if(!response.ok||!data?.token||data.provider!=="livekit"||!data.room){setState("error");setError(response.status===409?labels.notReady:labels.unavailable);return;}setCredential({provider:"livekit",token:data.token,room:data.room});setState("ready");}catch{setState("error");setError(labels.unavailable)}}
  function discard(){setCredential(null);setState("idle");setError(null)}
  return (
    <section className={rx.card} aria-labelledby="call-token-title">
      <h2 id="call-token-title" className={styles.sectionTitle}>{labels.title}</h2>
      {state==="ready"&&credential ? (
        <div className={styles.stack}>
          <p className={styles.body} role="status">{labels.ready}</p>
          <Button variant="outline" label={labels.notReady} onClick={discard} />
        </div>
      ) : (
        <Button fullWidth startIcon="video-camera" label={state==="loading"?labels.loading:labels.join} loading={state==="loading"} onClick={() => void requestToken()} />
      )}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </section>
  );
}
