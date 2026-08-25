# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/HttpClient.ts`
- **Member SHA-256:** `48cd527414460cdb45cb2927f7207b1da736a242023450784bfe257ad7772830`
- **Line count:** 70
- **Read range:** `1-70`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `19: // Retry only safe reads. A mutation is never replayed or transformed into success`
- `24: const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };`
- `27: config._retryCount = config._retryCount || 0;`
- `30: const shouldRetry = isSafeRead && (!error.response || error.response.status >= 500);`
- `32: if (shouldRetry && config._retryCount < 3) {`
- `33: config._retryCount += 1;`
- `34: const delay = Math.pow(2, config._retryCount) * 1000;`
### backend_consumers_or_contracts
- `1: import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';`
- `7: ? `${process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}/api/v1``
- `8: : 'https://api.nabd.plus/api/v1';`
- `10: export const HttpClient = axios.create({`
- `23: async (error: AxiosError) => {`
- `24: const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };`
- `63: export interface HttpRequestConfig extends InternalAxiosRequestConfig {}`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';`
- `15: export class OfflineMutationPendingError extends Error {`
- `16: constructor() { super('offline_mutation_pending_contract'); }`
- `19: // Retry only safe reads. A mutation is never replayed or transformed into success`
- `23: async (error: AxiosError) => {`
- `24: const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };`
- `25: if (!config) return Promise.reject(error);`
- `27: config._retryCount = config._retryCount || 0;`
- `30: const shouldRetry = isSafeRead && (!error.response || error.response.status >= 500);`
- `32: if (shouldRetry && config._retryCount < 3) {`
- `33: config._retryCount += 1;`
- `34: const delay = Math.pow(2, config._retryCount) * 1000;`
### payment_insurance_relevance
- `65: export interface PaginatedResponse<T> { items: T[]; total: number; data?: T[]; }`
### error_empty_loading_retry_cancel
- `1: import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';`
- `12: timeout: 15000,`
- `15: export class OfflineMutationPendingError extends Error {`
- `16: constructor() { super('offline_mutation_pending_contract'); }`
- `19: // Retry only safe reads. A mutation is never replayed or transformed into success`
- `23: async (error: AxiosError) => {`
- `24: const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };`
- `25: if (!config) return Promise.reject(error);`
- `27: config._retryCount = config._retryCount || 0;`
- `30: const shouldRetry = isSafeRead && (!error.response || error.response.status >= 500);`
- `32: if (shouldRetry && config._retryCount < 3) {`
- `33: config._retryCount += 1;`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
