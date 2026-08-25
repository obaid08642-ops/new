# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/guided-tour/types/index.ts`
- **Member SHA-256:** `7e2262a79b6f2fd89a4367f5ce9b62cc5e0b6f091107681c11df2c5b50ada6fb`
- **Line count:** 54
- **Read range:** `1-54`
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
- `1: export type TourStatus = 'idle' | 'loading' | 'starting' | 'active' | 'paused' | 'resuming' | 'celebrating' | 'completed' | 'skipped' | 'error' | 'recovering';`
- `42: status: 'completed' | 'skipped' | 'in_progress' | 'skip_all';`
- `43: completedSteps: string[];`
- `48: completedAt?: string;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: export type TourStatus = 'idle' | 'loading' | 'starting' | 'active' | 'paused' | 'resuming' | 'celebrating' | 'completed' | 'skipped' | 'error' | 'recovering';`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
