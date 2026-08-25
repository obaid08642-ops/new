# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/offlineQueue.security.test.ts`
- **Member SHA-256:** `b25b04a8ba1aefc0e855703137fceed676485b83d88e8f842b4dac157d34e916`
- **Line count:** 24
- **Read range:** `1-24`
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
- `9: OfflineMessageQueueDisabledError,`
- `19: })).rejects.toBeInstanceOf(OfflineMessageQueueDisabledError);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: addOfflineMessage,`
- `9: OfflineMessageQueueDisabledError,`
- `10: } from './offlineQueue';`
- `12: describe('offline message queue safety', () => {`
- `16: await expect(addOfflineMessage({`
- `19: })).rejects.toBeInstanceOf(OfflineMessageQueueDisabledError);`
- `21: expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@nabdah_offline_messages');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
