# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/diagnostics/packages/page.tsx`
- **Member SHA-256:** `cc9dc294fb33b4ddc6dc2ce86294eedb785c317a27167af198415b4b72bc4658`
- **Line count:** 27
- **Read range:** `1-27`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export default async function LabsPackagesPage({ params, searchParams }: Props) {`
- `19: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link cla`
- `22: return <main className={`main ${styles.page}`}>`
- `24: <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name="q" defaultValue={search} placeholder={t("sea`
- `25: {packages.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || category ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-`
### backend_consumers_or_contracts
- `5: import { extractLabServices } from "@/lib/api/labs";`
- `6: import { getPublicLabServices } from "@/lib/api/labs-server";`
- `8: import styles from "../labs/labs.module.css";`
### auth_ownership
- `19: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link cla`
- `24: <form className={styles.filters} method="get" role="search"><label className={styles.search}><Search size={18} aria-hidden="true" /><span className="sr-only">{t("searchLabel")}</span><input name="q" defaultValue={search} placeholder={t("sea`
### state_transitions
- `19: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link cla`
- `25: {packages.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || category ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-`
### payment_insurance_relevance
- `25: {packages.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || category ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-`
### error_empty_loading_retry_cancel
- `19: if (!response || !response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FlaskConical size={28} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><Link cla`
- `20: const packages = extractLabServices(await response.json().catch(() => null)).filter((item) => item.isPackage !== false);`
- `25: {packages.length === 0 ? <section className={styles.state}><FlaskConical size={26} aria-hidden="true" /><h2>{t("emptyTitle")}</h2><p>{search || category ? t("noMatch") : t("emptyBody")}</p></section> : <section className={styles.grid} aria-`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
