# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/persistence/config.ts`
- **Member SHA-256:** `230235e43a9477c195343e5700dd9f9ba133c3862d17c345ec309ae9069092f8`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `21: // auth: Tokens are handled by SessionManager via SecureStore independently`
- `24: 'session',`
### state_transitions
- `2: import { storeVersionManager, CURRENT_STATE_SCHEMA_VERSION } from './StoreVersionManager';`
- `6: version: CURRENT_STATE_SCHEMA_VERSION,`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- No matching static signal found in this member.

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
