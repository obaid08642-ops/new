# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/security/EncryptionService.ts`
- **Member SHA-256:** `88c074e289a0319be9552c79550e5402085975545654c4a0c405ca23d39a24eb`
- **Line count:** 52
- **Read range:** `1-52`
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
- `35: if (!this.masterKey) throw new Error('EncryptionService not initialized');`
- `45: if (!this.masterKey) throw new Error('EncryptionService not initialized');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `35: if (!this.masterKey) throw new Error('EncryptionService not initialized');`
- `45: if (!this.masterKey) throw new Error('EncryptionService not initialized');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
