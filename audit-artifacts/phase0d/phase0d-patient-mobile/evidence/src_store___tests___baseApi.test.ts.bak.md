# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/__tests__/baseApi.test.ts.bak`
- **Member SHA-256:** `74b09f80c41acf49c39752a277e505ddd81836b5323b435ea49b9a5a727f324a`
- **Line count:** 28
- **Read range:** `1-28`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `1: import { baseApi } from '../api/baseApi';`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `2: import { httpRequest, HttpError } from '../../services/HttpClient';`
- `6: HttpError: class extends Error {`
- `7: status: number;`
- `9: originalError?: unknown;`
- `10: constructor(status: number, code: string, message: string, originalError?: unknown) {`
- `12: this.status = status;`
- `14: this.originalError = originalError;`
- `20: it('should return data on success', async () => {`
- `21: (httpRequest as jest.Mock).mockResolvedValue({ data: { success: true } });`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `2: import { httpRequest, HttpError } from '../../services/HttpClient';`
- `6: HttpError: class extends Error {`
- `9: originalError?: unknown;`
- `10: constructor(status: number, code: string, message: string, originalError?: unknown) {`
- `14: this.originalError = originalError;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
