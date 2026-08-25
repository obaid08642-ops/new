# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/consultations/specialties/page.tsx`
- **Member SHA-256:** `9f80b2a2a3911aea7cd930c82ec8d38fab6e536d98a941e35c28347f41c0bdd2`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `12: export default async function SpecialtySelectPage({ params, searchParams }: Props) {`
- `23: return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Stethoscope size={28} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p`
- `29: return <main className={`main ${styles.page}`}>`
- `32: {filtered.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Search size={26} aria-hidden="true" /></span><h2>{t("emptyTitle")}</h2><p>{specialties.length === 0 ? t("emptyBody") : t("noMatch")}</p></section`
### backend_consumers_or_contracts
- `5: import { extractSpecialties } from "@/lib/api/specialties";`
- `6: import { getPublicSpecialties } from "@/lib/api/specialties-server";`
- `32: {filtered.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Search size={26} aria-hidden="true" /></span><h2>{t("emptyTitle")}</h2><p>{specialties.length === 0 ? t("emptyBody") : t("noMatch")}</p></section`
### auth_ownership
- `4: import { ArrowLeft, ArrowRight, RefreshCw, Search, Stethoscope } from "lucide-react";`
- `23: return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Stethoscope size={28} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p`
- `31: <form className={styles.search} method="get" role="search"><Search size={18} aria-hidden="true" /><label className="sr-only" htmlFor="specialty-search">{t("searchLabel")}</label><input id="specialty-search" name="q" defaultValue={q} placeho`
### state_transitions
- `23: return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Stethoscope size={28} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p`
- `32: {filtered.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Search size={26} aria-hidden="true" /></span><h2>{t("emptyTitle")}</h2><p>{specialties.length === 0 ? t("emptyBody") : t("noMatch")}</p></section`
### payment_insurance_relevance
- `32: {filtered.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Search size={26} aria-hidden="true" /></span><h2>{t("emptyTitle")}</h2><p>{specialties.length === 0 ? t("emptyBody") : t("noMatch")}</p></section`
### error_empty_loading_retry_cancel
- `23: return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><span className={styles.stateIcon}><Stethoscope size={28} aria-hidden="true" /></span><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p`
- `26: const specialties = extractSpecialties(await response.json().catch(() => null));`
- `32: {filtered.length === 0 ? <section className={styles.state}><span className={styles.stateIcon}><Search size={26} aria-hidden="true" /></span><h2>{t("emptyTitle")}</h2><p>{specialties.length === 0 ? t("emptyBody") : t("noMatch")}</p></section`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
