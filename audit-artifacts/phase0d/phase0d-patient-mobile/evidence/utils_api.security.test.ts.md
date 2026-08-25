# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `utils/api.security.test.ts`
- **Member SHA-256:** `0f1712d001a72265fad5bba098f67adbb7bb8dae692c0c7855cb587ff3238f7d`
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
- `12: import { storeAuthSession } from './api';`
- `14: describe('legacy api session storage', () => {`
- `17: it('does not report a stored session when secure storage rejects', async () => {`
- `20: await expect(storeAuthSession({ accessToken: 'token', refreshToken: 'refresh' })).resolves.toBeNull();`
### state_transitions
- `18: (secureSet as jest.Mock).mockRejectedValue(new Error('secure store unavailable'));`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `18: (secureSet as jest.Mock).mockRejectedValue(new Error('secure store unavailable'));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
