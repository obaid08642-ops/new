import axios, { AxiosError } from 'axios';
import { DEFAULT_TIMEOUT_MS, MAX_RETRIES, pause, planRetries, retryAfterTooLong, retryDelayMs, shouldRetryStatus, timeoutFor } from './requestPolicy';
import { API_BASE } from '../constants';
import { buildHeaders, Tokens, Vault, SK, CryptoUtils } from '../security/Security';

type RetryableConfig = { _generatedKey?: boolean; _retryCount?: number; _retry?: boolean };

const client = axios.create({
  baseURL: API_BASE,
  timeout: DEFAULT_TIMEOUT_MS,
});

// Request Interceptor: Automatically inject secure headers and JWT token
client.interceptors.request.use(
 async (config) => {
  // 15.1: 15 s by default, 60 s for an upload, 45 s for the AI routes, unless the caller set its own.
  if (config.timeout === undefined || config.timeout === DEFAULT_TIMEOUT_MS) config.timeout = timeoutFor(String(config.url || ''), config.data);
  try {
  if (__DEV__) {
    const customIp = await Vault.get(SK.CUSTOM_API_IP);
    if (customIp) {
      config.baseURL = `http://${customIp}:8002/api/v1`;
    }
  }
 const secureHeaders = await buildHeaders(true);
 config.headers = {
 ...config.headers,
 ...secureHeaders,
 } as any;
 // Routes marked @RequireIdempotency answer 400 idempotency_key_required without a key.
 // A caller needing retry de-duplication sets its own stable key; otherwise one per request.
 const method = String(config.method || 'get').toUpperCase();
 const h: any = config.headers;
 if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !h['Idempotency-Key'] && !h['idempotency-key']) {
   h['Idempotency-Key'] = `prov-${await CryptoUtils.randomHex(16)}`;
   // 15.1: a key made for this one call is not the caller's own, so the call is not replayed after an unknown outcome.
   (config as RetryableConfig)._generatedKey = true;
 }
 } catch (e) {
 if (__DEV__) console.warn('[API Client Request Interceptor Error]', e);
 }
 return config;
 },
 (error) => Promise.reject(error)
);

/**
 * Reject with the AxiosError itself. The interceptor used to reject with `error.response.data` (the bare body), so
 * `err.response` was undefined and every screen that reads `err.response.data.message` or `err.response.status`
 * (about 70 catch blocks: payout codes, "collect the exact amount", "invitation already answered", the 401 fallbacks)
 * silently fell back to its generic text. `err.message` stays the server's sentence, as the screens that read it expect.
 */
export function keepResponse(error: any): any {
  const body = error?.response?.data;
  if (body && typeof body === 'object') {
    const m = Array.isArray(body.message) ? body.message.filter((x: unknown) => typeof x === 'string').join(', ') : body.message;
    if (typeof m === 'string' && m) error.message = m;
    error.statusCode = body.statusCode ?? error.response.status;
  }
  return error;
}

// Response Interceptor: Handle token expiration and standard error routing
client.interceptors.response.use(
 (response) => response,
 async (error) => {
 const originalRequest = error.config;

 // 15.1: a safe read, or a write carrying the caller's own idempotency key, is tried again on a timeout, a lost connection
 // or 502/503/504; 429 is tried again for every request. The wait honours Retry-After, else backs off with jitter.
 if (originalRequest && !axios.isCancel(error)) {
   const state = originalRequest as RetryableConfig;
   const plan = planRetries(originalRequest.method, !state._generatedKey && !!(originalRequest.headers as any)?.['Idempotency-Key']);
   const status = error.response?.status;
   const retryAfter = error.response?.headers?.['retry-after'] as string | undefined;
   const retryable = status === undefined ? plan.retryTransport : shouldRetryStatus(status, plan);
   state._retryCount = state._retryCount || 0;
   if (retryable && state._retryCount < MAX_RETRIES && !retryAfterTooLong(retryAfter)) {
     const attempt = state._retryCount;
     state._retryCount += 1;
     await pause(retryDelayMs(attempt, retryAfter), originalRequest.signal as AbortSignal | undefined);
     return client(originalRequest);
   }
 }
 
 // If unauthorized (401) and not already retrying, session expired
 if (error.response?.status === 401 && !originalRequest._retry) {
 originalRequest._retry = true;
 try {
 // Clear expired tokens if session can't be refreshed
 await Tokens.clear();
 } catch (e) {
 if (__DEV__) console.warn('[API Client Session Clear Error]', e);
 }
 }
 
 return Promise.reject(keepResponse(error));
 }
);

export default client;
