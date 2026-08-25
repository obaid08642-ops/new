# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/cart/prescription/page.tsx`
- **Member SHA-256:** `08a637335b65f084562babf5cf2bbfc5d193401816c55f157358f2a9d6ef2da5`
- **Line count:** 31
- **Read range:** `1-31`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `13: export default async function CartPrescriptionPreviewPage({ params }: Props) {`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileCheck2 size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section`
- `26: return <main className={`main ${styles.page}`}>`
- `29: <Link className={styles.back} href={`/${locale}/cart`}>{t("back")}<Direction size={17} aria-hidden="true" /></Link>`
### backend_consumers_or_contracts
- `5: import { callPatientApi } from "@/lib/api/upstream";`
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `6: import { requirePatientAccess } from "@/lib/auth/session";`
- `18: const token = await requirePatientAccess(locale);`
- `19: const response = await callPatientApi("/cart/prescription", {}, token);`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileCheck2 size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section`
### state_transitions
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `20: if (response.status === 401) redirect(`/${locale}/login`);`
- `21: if (response.status === 403 || response.status === 404) notFound();`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileCheck2 size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section`
- `28: {medications.length ? <section className={styles.groups}><article className={styles.group}><div className={styles.groupHead}><h2>{t("itemCount")}</h2><span>{medications.length}</span></div>{medications.map((item, index) => <div className={s`
### payment_insurance_relevance
- `23: const payload = await response.json().catch(() => null) as { prescription_id?: unknown; medications?: unknown } | null;`
- `24: const medications = Array.isArray(payload?.medications) ? payload.medications.flatMap((item) => typeof item === "object" && item && typeof (item as { name?: unknown }).name === "string" ? [{ name: (item as { name: string }).name }] : []) : `
### error_empty_loading_retry_cancel
- `8: import { RetryButton } from "@/components-next/retry-button";`
- `22: if (!response.ok) return <main className={`main ${styles.page}`}><section className={styles.state} role="alert"><FileCheck2 size={25} aria-hidden="true" /><h1>{t("unavailableTitle")}</h1><p>{t("unavailableBody")}</p><RetryButton /></section`
- `23: const payload = await response.json().catch(() => null) as { prescription_id?: unknown; medications?: unknown } | null;`
- `28: {medications.length ? <section className={styles.groups}><article className={styles.group}><div className={styles.groupHead}><h2>{t("itemCount")}</h2><span>{medications.length}</span></div>{medications.map((item, index) => <div className={s`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
