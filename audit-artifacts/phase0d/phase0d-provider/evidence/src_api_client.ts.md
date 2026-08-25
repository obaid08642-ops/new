# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/api/client.ts`
- **Member SHA-256:** `cae9211d607b7838f0b52f9a5ab0880bcb3ad05054f34673b03e37b9ce6ca6b6`
- **Line count:** 52
- **Read range:** `1-52`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `37: // If unauthorized (401) and not already retrying, session expired`
- `38: if (error.response?.status === 401 && !originalRequest._retry) {`
- `39: originalRequest._retry = true;`
### backend_consumers_or_contracts
- `1: import axios from 'axios';`
- `5: const client = axios.create({`
- `16: config.baseURL = `http://${customIp}:8002/api/v1`;`
### auth_ownership
- `3: import { buildHeaders, Tokens, Vault, SK } from '../security/Security';`
- `10: // Request Interceptor: Automatically inject secure headers and JWT token`
- `31: // Response Interceptor: Handle token expiration and standard error routing`
- `37: // If unauthorized (401) and not already retrying, session expired`
- `41: // Clear expired tokens if session can't be refreshed`
- `42: await Tokens.clear();`
- `44: if (__DEV__) console.warn('[API Client Session Clear Error]', e);`
### state_transitions
- `24: if (__DEV__) console.warn('[API Client Request Interceptor Error]', e);`
- `28: (error) => Promise.reject(error)`
- `31: // Response Interceptor: Handle token expiration and standard error routing`
- `34: async (error) => {`
- `35: const originalRequest = error.config;`
- `37: // If unauthorized (401) and not already retrying, session expired`
- `38: if (error.response?.status === 401 && !originalRequest._retry) {`
- `39: originalRequest._retry = true;`
- `44: if (__DEV__) console.warn('[API Client Session Clear Error]', e);`
- `48: return Promise.reject(error.response?.data || error);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `7: timeout: 60000,`
- `23: } catch (e) {`
- `24: if (__DEV__) console.warn('[API Client Request Interceptor Error]', e);`
- `28: (error) => Promise.reject(error)`
- `31: // Response Interceptor: Handle token expiration and standard error routing`
- `34: async (error) => {`
- `35: const originalRequest = error.config;`
- `37: // If unauthorized (401) and not already retrying, session expired`
- `38: if (error.response?.status === 401 && !originalRequest._retry) {`
- `39: originalRequest._retry = true;`
- `43: } catch (e) {`
- `44: if (__DEV__) console.warn('[API Client Session Clear Error]', e);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
