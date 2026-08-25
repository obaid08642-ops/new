# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/prescriptions/[prescriptionId]/page.tsx`
- **Member SHA-256:** `a5ca4b7cfd0dc99ac5ba410adb297bdf61bfecdd3676433ca7995d44edc64c6d`
- **Line count:** 26
- **Read range:** `1-26`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `11: export default async function PrescriptionDetailPage({ params }: Props) {`
- `18: return <main className={`main ${styles.page}`}>`
- `23: <Link className={styles.date} href={`/${locale}/prescriptions`}>{t("back")}</Link>`
### backend_consumers_or_contracts
- `5: import { requirePatientAccess } from "@/lib/auth/session";`
### auth_ownership
- `5: import { requirePatientAccess } from "@/lib/auth/session";`
- `19: <section className={styles.state} role="alert">`
### state_transitions
- `19: <section className={styles.state} role="alert">`
- `22: <p>{t("contractPending")}</p>`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `22: <p>{t("contractPending")}</p>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
