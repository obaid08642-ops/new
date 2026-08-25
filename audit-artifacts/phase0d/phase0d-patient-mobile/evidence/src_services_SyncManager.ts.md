# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/SyncManager.ts`
- **Member SHA-256:** `8dbc75be79dc960ea871b185684ff097c23e870281d08b1da0de6f4e933675d6`
- **Line count:** 37
- **Read range:** `1-37`
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
- `11: export class OfflineMutationQueueDisabledError extends Error {`
- `12: constructor() { super('offline_mutation_queue_disabled_pending_contract'); }`
- `23: throw new OfflineMutationQueueDisabledError();`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `11: export class OfflineMutationQueueDisabledError extends Error {`
- `12: constructor() { super('offline_mutation_queue_disabled_pending_contract'); }`
- `23: throw new OfflineMutationQueueDisabledError();`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
