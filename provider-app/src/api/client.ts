import axios from 'axios';
import { API_BASE } from '../constants';
import { buildHeaders, Tokens, Vault, SK, CryptoUtils } from '../security/Security';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// Request Interceptor: Automatically inject secure headers and JWT token
client.interceptors.request.use(
 async (config) => {
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
