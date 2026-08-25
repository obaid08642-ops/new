# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/store/api/baseApi.ts`
- **Member SHA-256:** `d2470e8f2001564b8a1c2d702d5168745b75e119eb95dd75f8fd7e290a5bc0bf`
- **Line count:** 50
- **Read range:** `1-50`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: * This ensures RTK Query uses the exact same interceptors, retry logic, offline queue,`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `9: * and token management as the rest of the application.`
### state_transitions
- `3: import { httpRequest, HttpRequestConfig, HttpError } from '../../services/HttpClient';`
- `8: * This ensures RTK Query uses the exact same interceptors, retry logic, offline queue,`
- `14: { status: number; data: unknown; message?: string }`
- `28: } catch (error: any) {`
- `30: error: {`
- `31: status: error?.response?.status || error?.status || 500,`
- `32: data: error?.response?.data || error?.data || null,`
- `33: message: error?.message || 'An unexpected error occurred.',`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `3: import { httpRequest, HttpRequestConfig, HttpError } from '../../services/HttpClient';`
- `8: * This ensures RTK Query uses the exact same interceptors, retry logic, offline queue,`
- `22: timeout: args.timeout,`
- `28: } catch (error: any) {`
- `30: error: {`
- `31: status: error?.response?.status || error?.status || 500,`
- `32: data: error?.response?.data || error?.data || null,`
- `33: message: error?.message || 'An unexpected error occurred.',`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
