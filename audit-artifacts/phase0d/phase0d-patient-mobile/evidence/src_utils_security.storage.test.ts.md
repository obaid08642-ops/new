# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/security.storage.test.ts`
- **Member SHA-256:** `e65da540d504221cf283d2fcacc548896f36a4cc547f2d94626bc713a5b6df65`
- **Line count:** 34
- **Read range:** `1-34`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `24: await expect(secureSet('@session', 'secret-token')).rejects.toBeInstanceOf(SecureStorageUnavailableError);`
- `31: await expect(secureGet('@session')).rejects.toBeInstanceOf(SecureStorageUnavailableError);`
### state_transitions
- `16: import { SecureStorageUnavailableError, secureGet, secureSet } from './security';`
- `22: mockSecureStore.setItemAsync.mockRejectedValue(new Error('keystore unavailable'));`
- `24: await expect(secureSet('@session', 'secret-token')).rejects.toBeInstanceOf(SecureStorageUnavailableError);`
- `29: mockSecureStore.getItemAsync.mockRejectedValue(new Error('keystore unavailable'));`
- `31: await expect(secureGet('@session')).rejects.toBeInstanceOf(SecureStorageUnavailableError);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `16: import { SecureStorageUnavailableError, secureGet, secureSet } from './security';`
- `22: mockSecureStore.setItemAsync.mockRejectedValue(new Error('keystore unavailable'));`
- `24: await expect(secureSet('@session', 'secret-token')).rejects.toBeInstanceOf(SecureStorageUnavailableError);`
- `29: mockSecureStore.getItemAsync.mockRejectedValue(new Error('keystore unavailable'));`
- `31: await expect(secureGet('@session')).rejects.toBeInstanceOf(SecureStorageUnavailableError);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
