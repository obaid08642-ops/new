# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/HttpClient.offline.test.ts`
- **Member SHA-256:** `ca6d156bfb0db9ebde258cfc9f1a6a10625e317ce24d3b3b6b1ba43905f8ab2b`
- **Line count:** 14
- **Read range:** `1-14`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `4: it('rejects a network-failed mutation without retry, queue, or synthetic success', async () => {`
- `7: config: { method: 'post', url: '/unified-bookings', headers: {} },`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import { HttpClient, OfflineMutationPendingError } from './HttpClient';`
- `4: it('rejects a network-failed mutation without retry, queue, or synthetic success', async () => {`
- `5: const handler = (HttpClient.interceptors.response as any).handlers[0].rejected;`
- `6: const error = {`
- `12: await expect(handler(error)).rejects.toBeInstanceOf(OfflineMutationPendingError);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: import { HttpClient, OfflineMutationPendingError } from './HttpClient';`
- `3: describe('HttpClient offline mutation contract', () => {`
- `4: it('rejects a network-failed mutation without retry, queue, or synthetic success', async () => {`
- `6: const error = {`
- `12: await expect(handler(error)).rejects.toBeInstanceOf(OfflineMutationPendingError);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
