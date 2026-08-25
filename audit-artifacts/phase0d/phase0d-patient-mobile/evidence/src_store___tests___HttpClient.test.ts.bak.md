# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/__tests__/HttpClient.test.ts.bak`
- **Member SHA-256:** `5173da8997ef9e3956df633870022cc69848002a57c6713979a0ee38f7ff4839`
- **Line count:** 25
- **Read range:** `1-25`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- No matching static signal found in this member.
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: import { enqueueOfflineRequest } from '../../services/HttpClient';`
- `9: describe('HttpClient Offline Queue', () => {`
- `15: await enqueueOfflineRequest('/test', { method: 'POST', body: { a: 1 } });`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
