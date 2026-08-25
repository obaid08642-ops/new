# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/repositories/core/BaseRepository.ts`
- **Member SHA-256:** `9ca95e7e06a1089802c1b77bcee4765d9ac9a129652f9e334df828d4d1abfaf6`
- **Line count:** 81
- **Read range:** `1-81`
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
- `54: throw new Error('Local source not configured');`
- `65: throw new Error('Local source not configured');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `54: throw new Error('Local source not configured');`
- `65: throw new Error('Local source not configured');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
