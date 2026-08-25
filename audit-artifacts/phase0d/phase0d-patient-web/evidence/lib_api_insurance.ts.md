# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/insurance.ts`
- **Member SHA-256:** `a3e744c45895d8541efc9032d226886d280005f6d15328b819e470b15e50e978`
- **Line count:** 4
- **Read range:** `1-4`
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
- `4: export function parseInsuranceSummary(payload: unknown): InsuranceSummary | null { const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null; const parsed = schema.safeParse(r`
### payment_insurance_relevance
- `3: export type InsuranceSummary = { hasPolicy: boolean; companyName?: string; planClass?: string };`
- `4: export function parseInsuranceSummary(payload: unknown): InsuranceSummary | null { const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null; const parsed = schema.safeParse(r`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
