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

// 13.R5 — normalize backend `{code|error_code,message,nextStep,details}`
// envelopes (UPPER_SNAKE catalog codes + lower_snake aliases such as
// `slot_taken`) so Toast/context reads the catalog instead of raw strings.
const CODE_PATTERN = /^[A-Za-z0-9_.-]{1,80}$/;

export function normalizeProviderErrorCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!CODE_PATTERN.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

export interface NormalizedProviderError {
  code: string;
  error_code: string;
  message: string;
  nextStep?: string;
  details?: Record<string, unknown>;
  status?: number;
  original?: unknown;
}

export function toNormalizedProviderError(input: unknown, status?: number): NormalizedProviderError | null {
  const src = ((): Record<string, unknown> | null => {
    if (!input || typeof input !== 'object') return null;
    const rec = input as Record<string, unknown>;
    // Axios-style error: prefer response.data, fall back to the error itself.
    const data = (rec.response as Record<string, unknown> | undefined)?.data;
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    if (rec.data && typeof rec.data === 'object') return rec.data as Record<string, unknown>;
    return rec;
  })();
  if (!src) return null;
  const rawCode = (src.code ?? src.error_code) as unknown;
  const code = normalizeProviderErrorCode(rawCode);
  if (!code) return null;
  const message = typeof src.message === 'string' && src.message.length > 0 ? src.message : String(rawCode);
  const out: NormalizedProviderError = {
    code,
    error_code: code,
    message,
    status,
    original: input,
  };
  if (typeof src.nextStep === 'string') out.nextStep = src.nextStep;
  if (src.details && typeof src.details === 'object') out.details = src.details as Record<string, unknown>;
  return out;
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
  
  const normalized = toNormalizedProviderError(
    error.response?.data ?? error,
    error.response?.status,
  );
  if (normalized) return Promise.reject(normalized);
  return Promise.reject(error.response?.data || error);
  }
);

export default client;
