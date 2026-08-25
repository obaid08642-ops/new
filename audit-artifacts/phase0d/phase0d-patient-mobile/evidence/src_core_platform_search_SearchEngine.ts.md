# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/core/platform/search/SearchEngine.ts`
- **Member SHA-256:** `370e48686079a122679c2f7b32b5eae070ae1f9a8c8b0211a18e059400649c04`
- **Line count:** 69
- **Read range:** `1-69`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `18: page?: number;`
- `25: page: number;`
- `44: page: query.page || 1,`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- `24: total: number;`
- `43: total: 0,`
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
