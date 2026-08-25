# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/services/HttpClient.ts`
- **Member SHA-256:** `a37d90412435872af44051935bd1e3943e87a26a584f1056c06a9b0db2dff805`
- **Line count:** 29
- **Read range:** `1-29`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `8: // Custom global retry interceptor for 5xx and network errors`
- `12: const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };`
- `15: config._retryCount = config._retryCount || 0;`
- `17: const shouldRetry = !error.response || error.response.status >= 500;`
- `19: if (shouldRetry && config._retryCount < 3) {`
- `20: config._retryCount += 1;`
- `21: const delay = Math.pow(2, config._retryCount) * 1000;`
### backend_consumers_or_contracts
- `1: import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';`
- `3: export const HttpClient = axios.create({`
- `4: baseURL: 'https://api.nabdahplus.com/api/v1',`
- `11: async (error: AxiosError) => {`
- `12: const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };`
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `1: import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';`
- `8: // Custom global retry interceptor for 5xx and network errors`
- `11: async (error: AxiosError) => {`
- `12: const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };`
- `13: if (!config) return Promise.reject(error);`
- `15: config._retryCount = config._retryCount || 0;`
- `17: const shouldRetry = !error.response || error.response.status >= 500;`
- `19: if (shouldRetry && config._retryCount < 3) {`
- `20: config._retryCount += 1;`
- `21: const delay = Math.pow(2, config._retryCount) * 1000;`
- `27: return Promise.reject(error);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `1: import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';`
- `5: timeout: 15000,`
- `8: // Custom global retry interceptor for 5xx and network errors`
- `11: async (error: AxiosError) => {`
- `12: const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };`
- `13: if (!config) return Promise.reject(error);`
- `15: config._retryCount = config._retryCount || 0;`
- `17: const shouldRetry = !error.response || error.response.status >= 500;`
- `19: if (shouldRetry && config._retryCount < 3) {`
- `20: config._retryCount += 1;`
- `21: const delay = Math.pow(2, config._retryCount) * 1000;`
- `23: await new Promise((resolve) => setTimeout(resolve, delay));`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
