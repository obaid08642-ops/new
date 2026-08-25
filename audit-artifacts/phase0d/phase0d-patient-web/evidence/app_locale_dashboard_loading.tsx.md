# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `app/[locale]/dashboard/loading.tsx`
- **Member SHA-256:** `7e96483ce2656f2817a1feabaf76238549024d789b001215b473bee3de335d2d`
- **Line count:** 2
- **Read range:** `1-2`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: export default async function DashboardLoading() { const t = await getTranslations("Dashboard"); return <main className="main dashboard"><div className="skeleton" aria-label={t("loading")}><i style={{ width: "28%" }} /><i style={{ width: "6`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: export default async function DashboardLoading() { const t = await getTranslations("Dashboard"); return <main className="main dashboard"><div className="skeleton" aria-label={t("loading")}><i style={{ width: "28%" }} /><i style={{ width: "6`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
