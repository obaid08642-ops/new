# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/middleware/memoryManager.ts`
- **Member SHA-256:** `545cc92e2fdcceed376c18ac4f7f80a59cf6894cb71408ad7ed2d4b6a6908aa4`
- **Line count:** 41
- **Read range:** `1-41`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `2: import { baseApi } from '../api/baseApi';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `7: * Monitors the size of the Redux state and triggers cache cleanup`
- `22: const state = store.getState();`
- `23: if (state.api) {`
- `24: const queries = state.api.queries;`
- `33: // Dispatch util.resetApiState() or manually clear cache if needed.`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
