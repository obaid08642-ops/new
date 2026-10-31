"use client";

import { useState } from "react";
import { callTokenFailure } from "@/lib/consult/call-session";
import { Button } from "@/components-next/ui-generated/components/Button";
import { ButtonLink } from "@/components-next/pharmacy/button-link";
import rx from "@/components-next/pharmacy/rx.module.css";
import styles from "@/components-next/consult/consult.module.css";
import { TelehealthConsentCard, needsTelehealthConsent } from "@/components-next/consult/telehealth-consent-card";
import type { TelehealthConsentText } from "@/lib/legal/telehealth-consent";

type Labels = { title:string; join:string; loading:string; ready:string; unavailable:string; notReady:string; open:string };
type CallCredential = { provider:"livekit"; token:string; room:string };
/** `joinHref` is the video-call page of this appointment (/consultations/video-call?appointmentId=), which asks for its own credential; this launcher only checks that the visit is ready and then links there. */
export function CallTokenLauncher({ appointmentId, joinHref, labels, locale, consent = null }: { appointmentId:string; joinHref:string; labels:Labels; locale:string; consent?: TelehealthConsentText | null }) {
  // D-38: the server refuses the patient's call until the telehealth consent is accepted; the consent card is shown then
  const [consentAsked,setConsentAsked]=useState(false);
  const [state,setState]=useState<"idle"|"loading"|"ready"|"error">("idle"); const [credential,setCredential]=useState<CallCredential|null>(null); const [error,setError]=useState<string|null>(null);
  async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"no-store",credentials:"same-origin"});const data=await response.json().catch(()=>null);if(needsTelehealthConsent(data)){setState("idle");setConsentAsked(true);return;}if(!response.ok||!data?.token||data.provider!=="livekit"||!data.room){setState("error");setError(callTokenFailure(response.status,data)==='not_ready'?labels.notReady:labels.unavailable);return;}setCredential({provider:"livekit",token:data.token,room:data.room});setState("ready");}catch{setState("error");setError(labels.unavailable)}}
  function discard(){setCredential(null);setState("idle");setError(null)}
  return (
    <section className={rx.card} aria-labelledby="call-token-title">
      <h2 id="call-token-title" className={styles.sectionTitle}>{labels.title}</h2>
      {state==="ready"&&credential ? (
        <div className={styles.stack}>
          <p className={styles.body} role="status">{labels.ready}</p>
          <ButtonLink href={joinHref} label={labels.open} fullWidth />
          <Button variant="outline" label={labels.notReady} onClick={discard} />
        </div>
      ) : (
        <Button fullWidth startIcon="video-camera" label={state==="loading"?labels.loading:labels.join} loading={state==="loading"} onClick={() => void requestToken()} />
      )}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {consentAsked ? <TelehealthConsentCard locale={locale} consent={consent} onAccepted={() => { setConsentAsked(false); void requestToken(); }} /> : null}
    </section>
  );
}
