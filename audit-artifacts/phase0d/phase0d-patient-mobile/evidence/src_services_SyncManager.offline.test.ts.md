# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/SyncManager.offline.test.ts`
- **Member SHA-256:** `6374ed9f79eac7029f2cdafe00abd15cdedd7597cc28dc71eb1ed2c166658dd8`
- **Line count:** 10
- **Read range:** `1-10`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `6: method: 'post', url: '/orders', data: { sensitive: 'value' }, headers: { Authorization: 'Bearer token' },`
### auth_ownership
- `6: method: 'post', url: '/orders', data: { sensitive: 'value' }, headers: { Authorization: 'Bearer token' },`
### state_transitions
- `1: import { OfflineMutationQueueDisabledError, SyncManager } from './SyncManager';`
- `7: })).rejects.toBeInstanceOf(OfflineMutationQueueDisabledError);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: import { OfflineMutationQueueDisabledError, SyncManager } from './SyncManager';`
- `3: describe('SyncManager offline mutation safety', () => {`
- `7: })).rejects.toBeInstanceOf(OfflineMutationQueueDisabledError);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
