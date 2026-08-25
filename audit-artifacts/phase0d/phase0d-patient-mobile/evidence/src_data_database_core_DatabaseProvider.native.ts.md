# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/data/database/core/DatabaseProvider.native.ts`
- **Member SHA-256:** `4146b6a20a2a2498464bc5af10a3040e9869e8e1fa08139ddcce3b1671733f04`
- **Line count:** 33
- **Read range:** `1-33`
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
- `20: throw new Error('SQLCipher driver not yet implemented');`
- `22: throw new Error(`Unsupported database driver type: ${driverType}`);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `20: throw new Error('SQLCipher driver not yet implemented');`
- `22: throw new Error(`Unsupported database driver type: ${driverType}`);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
