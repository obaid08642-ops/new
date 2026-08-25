# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/labs/page.tsx`
- **Member SHA-256:** `f82abd97031612cb0c5d72440288963539dcc1587baa9857e7f2d21c7418cc0d`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export default async function LabsServicesPage({ params, searchParams }: Props) {`
- `20: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link cla`
- `22: return <main className={`main ${styles.page}`}>`
- `24: <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name="q" defaultValue={search} placeholder={t("sea`
### backend_consumers_or_contracts
- `5: import { extractLabServices } from "@/lib/api/labs";`
- `6: import { getPublicLabServices } from "@/lib/api/labs-server";`
- `8: import styles from "./labs.module.css";`
- `20: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link cla`
### auth_ownership
- `20: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link cla`
- `24: <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name="q" defaultValue={search} placeholder={t("sea`
### state_transitions
- `20: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link cla`
- `25: {services.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || homeOnly ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-`
### payment_insurance_relevance
- `25: {services.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || homeOnly ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-`
### error_empty_loading_retry_cancel
- `20: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link cla`
- `21: const services = extractLabServices(await response.json().catch(() => null));`
- `25: {services.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || homeOnly ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
