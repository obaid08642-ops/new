# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `components-next/call-token-launcher.tsx`
- **Member SHA-256:** `7b46e2762c9169b66427ade010a451ffa8b34d8b7a4799b6789639ad15988733`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `13: return <section className={styles.panel} aria-labelledby="call-token-title"><div className={styles.heading}><ShieldCheck size={17} aria-hidden="true"/><h2 id="call-token-title">{labels.title}</h2></div>{state==="ready"&&credential?<div clas`
### backend_consumers_or_contracts
- `11: async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"no-store",credentials:"same-origin"});const d`
### auth_ownership
- `5: import styles from "./call-token-launcher.module.css";`
- `8: type CallCredential = { provider:"livekit"; token:string; room:string };`
- `9: export function CallTokenLauncher({ appointmentId, labels }: { appointmentId:string; labels:Labels }) {`
- `11: async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"no-store",credentials:"same-origin"});const d`
- `13: return <section className={styles.panel} aria-labelledby="call-token-title"><div className={styles.heading}><ShieldCheck size={17} aria-hidden="true"/><h2 id="call-token-title">{labels.title}</h2></div>{state==="ready"&&credential?<div clas`
### state_transitions
- `3: import { useState } from "react";`
- `7: type Labels = { title:string; join:string; loading:string; ready:string; unavailable:string; notReady:string };`
- `10: const [state,setState]=useState<"idle"|"loading"|"ready"|"error">("idle"); const [credential,setCredential]=useState<CallCredential|null>(null); const [error,setError]=useState<string|null>(null);`
- `11: async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"no-store",credentials:"same-origin"});const d`
- `12: function discard(){setCredential(null);setState("idle");setError(null)}`
- `13: return <section className={styles.panel} aria-labelledby="call-token-title"><div className={styles.heading}><ShieldCheck size={17} aria-hidden="true"/><h2 id="call-token-title">{labels.title}</h2></div>{state==="ready"&&credential?<div clas`
### payment_insurance_relevance
- `12: function discard(){setCredential(null);setState("idle");setError(null)}`
- `13: return <section className={styles.panel} aria-labelledby="call-token-title"><div className={styles.heading}><ShieldCheck size={17} aria-hidden="true"/><h2 id="call-token-title">{labels.title}</h2></div>{state==="ready"&&credential?<div clas`
### error_empty_loading_retry_cancel
- `7: type Labels = { title:string; join:string; loading:string; ready:string; unavailable:string; notReady:string };`
- `10: const [state,setState]=useState<"idle"|"loading"|"ready"|"error">("idle"); const [credential,setCredential]=useState<CallCredential|null>(null); const [error,setError]=useState<string|null>(null);`
- `11: async function requestToken(){ if(state==="loading")return; setState("loading");setError(null);try{const response=await fetch(`/api/appointments/${appointmentId}/call-token`,{method:"GET",cache:"no-store",credentials:"same-origin"});const d`
- `12: function discard(){setCredential(null);setState("idle");setError(null)}`
- `13: return <section className={styles.panel} aria-labelledby="call-token-title"><div className={styles.heading}><ShieldCheck size={17} aria-hidden="true"/><h2 id="call-token-title">{labels.title}</h2></div>{state==="ready"&&credential?<div clas`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
