# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/prescriptions/page.tsx`
- **Member SHA-256:** `d4ed3d36bd529b0c331e085c07abc4df0ac475e0615363b80a1d99fb95b6a833`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `7: import { RetryButton } from "@/components-next/retry-button";`
- `13: export default async function PrescriptionsPage({ params }: Props) {`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileText size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></mai`
- `24: return <main className={`main ${styles.page}`}>`
### backend_consumers_or_contracts
- `3: import { extractPrescriptionSummaries } from "@/lib/api/prescriptions";`
- `4: import { getPatientPrescriptions } from "@/lib/api/prescriptions-server";`
- `5: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `5: import { requirePatientAccess } from "@/lib/auth/session";`
- `18: const token = await requirePatientAccess(locale);`
- `19: const response = await getPatientPrescriptions(token);`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileText size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></mai`
### state_transitions
- `7: import { RetryButton } from "@/components-next/retry-button";`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `21: if (response.status === 403 || response.status === 404) notFound();`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileText size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></mai`
- `32: {prescriptions.length === 0 ? <section className={styles.state}><FileText size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{prescriptions.map((prescription) => <article `
- `35: <strong className={styles.status}>{prescription.state || t("stateUnavailable")}</strong>`
### payment_insurance_relevance
- `32: {prescriptions.length === 0 ? <section className={styles.state}><FileText size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{prescriptions.map((prescription) => <article `
- `33: <span className={styles.cardIcon}><FileText size={19} aria-hidden="true" /></span>`
- `34: <div className={styles.cardBody}>`
### error_empty_loading_retry_cancel
- `7: import { RetryButton } from "@/components-next/retry-button";`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileText size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailable")}</p><RetryButton /></section></mai`
- `23: const prescriptions = extractPrescriptionSummaries(await response.json().catch(() => null));`
- `32: {prescriptions.length === 0 ? <section className={styles.state}><FileText size={25} aria-hidden="true" /><p>{t("empty")}</p></section> : <section className={styles.grid} aria-label={t("title")}>{prescriptions.map((prescription) => <article `

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
