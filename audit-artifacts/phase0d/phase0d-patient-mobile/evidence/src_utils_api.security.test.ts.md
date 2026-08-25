# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/api.security.test.ts`
- **Member SHA-256:** `eca1d2c3434464684b3cfc1a2a657bd176a90edbec5cd10a0b39050abefe486e`
- **Line count:** 49
- **Read range:** `1-49`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `43: it('does not create or retry as a guest session after an authentication error', async () => {`
### backend_consumers_or_contracts
- `29: await apiFetch('/public-data');`
- `40: await expect(apiFetch('/malformed')).rejects.toEqual(expect.objectContaining({ code: 'invalid_response' }));`
- `46: await expect(apiFetch('/patient-only')).rejects.toThrow('AUTH_ERROR_401');`
### auth_ownership
- `21: mockAsyncStorage.getItem.mockResolvedValue('legacy-token-that-must-not-be-used');`
- `26: it('never reads an authorization token from the legacy AsyncStorage mirror', async () => {`
- `34: expect(new Headers(request.headers).get('Authorization')).toBeNull();`
- `43: it('does not create or retry as a guest session after an authentication error', async () => {`
- `44: (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, json: jest.fn().mockResolvedValue({ message: 'missing token' }) });`
### state_transitions
- `15: import { ApiContractError, apiFetch } from './api';`
- `37: it('raises a typed contract error when a successful HTTP response is not JSON', async () => {`
- `38: (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: jest.fn().mockRejectedValue(new Error('invalid json')) });`
- `43: it('does not create or retry as a guest session after an authentication error', async () => {`
- `44: (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, json: jest.fn().mockResolvedValue({ message: 'missing token' }) });`
- `46: await expect(apiFetch('/patient-only')).rejects.toThrow('AUTH_ERROR_401');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `15: import { ApiContractError, apiFetch } from './api';`
- `37: it('raises a typed contract error when a successful HTTP response is not JSON', async () => {`
- `38: (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: jest.fn().mockRejectedValue(new Error('invalid json')) });`
- `43: it('does not create or retry as a guest session after an authentication error', async () => {`
- `46: await expect(apiFetch('/patient-only')).rejects.toThrow('AUTH_ERROR_401');`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
