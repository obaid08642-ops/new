# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/auth/AuthInterceptor.ts`
- **Member SHA-256:** `1904a1df3b3657952399dc41f590129d54bf33c0c7da65bb5b799f31e584b2c3`
- **Line count:** 44
- **Read range:** `1-44`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `40: // e.g. trigger global logout event`
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- `4: import { AuthSession } from './types';`
- `7: const AUTH_SESSION_KEY = 'app_auth_session';`
- `12: const sessionStr = await secureGet(AUTH_SESSION_KEY);`
- `13: if (sessionStr) {`
- `14: const session = JSON.parse(sessionStr) as AuthSession;`
- `15: if (session.accessToken) {`
- `20: Authorization: `Bearer ${session.accessToken}``
- `26: log.error('Failed to get auth token', err);`
- `37: // Phase 1C: Implement token refresh logic here`
- `39: log.warn('Unauthorized access, token might be expired');`
- `40: // e.g. trigger global logout event`
### state_transitions
- `1: import { HttpInterceptor, HttpRequestConfig, HttpResponse, HttpError } from '../HttpClient';`
- `26: log.error('Failed to get auth token', err);`
- `35: onError: async (error: HttpError) => {`
- `38: if (error.status === 401) {`
- `42: throw error;`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: import { HttpInterceptor, HttpRequestConfig, HttpResponse, HttpError } from '../HttpClient';`
- `25: } catch (err) {`
- `26: log.error('Failed to get auth token', err);`
- `35: onError: async (error: HttpError) => {`
- `38: if (error.status === 401) {`
- `42: throw error;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
