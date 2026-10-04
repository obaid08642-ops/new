/**
 * 15.1 — `apiFetch`: the app's single public network surface.
 *
 * All resilience policy (timeout, retry, `Retry-After`, cancellation, offline
 * detection, catalogue mapping) lives in `./http`. This module only does what is
 * specific to this app: read the token from secure storage, attach auth and the
 * idempotency key, and clear the session on a 401.
 *
 * It keeps its historical path and `(endpoint, options: RequestInit)` signature
 * so the ~170 screens already wired to it do not change.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';
import { config } from '../core/config';
import { httpRequest } from '../services/http/client';
import { ApiError, toApiError } from '../services/http/errors';

// All runtime URLs resolve through ConfigManager, including explicit local-dev
// settings. This client must not maintain a parallel localhost fallback.
export const BASE_URL = config.apiBaseUrl;
export const FASTAPI_BASE_URL = config.fastapiBaseUrl;
export const R2_PUBLIC_URL = config.cdnUrl;

export class ApiContractError extends Error {
  readonly code: 'invalid_response' | 'secure_storage_unavailable';
  constructor(code: 'invalid_response' | 'secure_storage_unavailable') {
    super(code);
    this.code = code;
  }
}

async function clearLegacyTokenMirror(): Promise<void> {
  // Migration cleanup only: a token is never read from or written to AsyncStorage.
  try { await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN); } catch {}
}

async function getToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    if (token && token !== '[object Object]' && token.length > 10) return token;
    if (token) await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    await clearLegacyTokenMirror();
    return null;
  } catch {
    await clearLegacyTokenMirror();
    return null;
  }
}

async function saveToken(token: string): Promise<void> {
  if (typeof token !== 'string' || !token || token === '[object Object]') {
    await clearLegacyTokenMirror();
    throw new ApiContractError('secure_storage_unavailable');
  }
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
    await clearLegacyTokenMirror();
  } catch {
    await clearLegacyTokenMirror();
    throw new ApiContractError('secure_storage_unavailable');
  }
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function newIdempotencyKey(): string {
  const uuid = (globalThis as any).crypto?.randomUUID?.();
  return `app-${uuid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`}`;
}

function headerValue(headers: RequestInit['headers'], name: string): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === 'function') return (headers as Headers).get(name);
  const record = headers as Record<string, string>;
  const hit = Object.keys(record).find((key) => key.toLowerCase() === name.toLowerCase());
  return hit ? record[hit] : null;
}

export interface ApiFetchExtras extends RequestInit {
  /** `'upload'` and `'ai'` select the 60 s / 45 s budgets from 15.1. */
  requestKind?: 'default' | 'upload' | 'ai';
  /** Locale used to resolve the catalogue message (ar | en | ur | hi | bn | fil). */
  locale?: string;
  /** Overrides the default 3 attempts (1 + 2 retries). 1 disables retries. */
  maxAttempts?: number;
  /**
   * Set false for a mutation that must never be replayed even though it carries
   * a key — payments, bookings, prescriptions, SOS.
   */
  retryable?: boolean;
}

/**
 * Perform an authenticated request.
 *
 * Rejects with an {@link ApiError} whose `message` is a stable machine token and
 * whose `userMessage` / `nextStep` come from the 13.R5 error catalogue. Use
 * `describeError(error)` to render it.
 */
export async function apiFetch<T = any>(endpoint: string, options: ApiFetchExtras = {}): Promise<T> {
  const method = String(options.method || 'GET').toUpperCase();
  const token = await getToken();
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers as HeadersInit | undefined);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Mutating routes marked @RequireIdempotency answer 400 idempotency_key_required
  // without a key. A key the CALLER supplied makes the request replayable; the
  // auto key below only de-duplicates this one attempt, so it must not unlock a
  // retry (15.1).
  const callerSuppliedIdempotencyKey = headers.get('Idempotency-Key') != null;
  const retryable = options.retryable !== false;
  if (MUTATING_METHODS.has(method) && !callerSuppliedIdempotencyKey) {
    headers.set('Idempotency-Key', newIdempotencyKey());
  }

  let response;
  try {
    response = await httpRequest<unknown>({
      url,
      method,
      headers,
      body: options.body,
      signal: options.signal ?? undefined,
      kind: options.requestKind,
      locale: options.locale,
      callerSuppliedIdempotencyKey: callerSuppliedIdempotencyKey && retryable,
      maxAttempts: options.maxAttempts,
    });
  } catch (error: any) {
    // Only an invalid/expired session (401) ends it. A 403 means "not allowed to
    // do this": signing the user out for it would log them out of the whole app on
    // one forbidden action.
    if (error instanceof ApiError && error.status === 401) {
      console.warn(`[apiFetch] Auth error for endpoint: ${endpoint}`);
      try { await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN); } catch {}
      await clearLegacyTokenMirror();
    }
    throw error;
  }

  // A 2xx with no body (e.g. GET /emergency/my/active when nothing is active) means
  // "no data", not a broken contract.
  if (response.data === null) return null as T;
  if (typeof response.data === 'string') {
    // A 2xx whose body is not JSON means the response shape contract is broken.
    throw new ApiContractError('invalid_response');
  }
  return response.data as T;
}

/** Re-exported so callers can render a catalogue message + next step. */
export { describeError, isApiError } from '../services/http/errors';
export type { BackendErrorCode } from '../services/http/errorCatalog';
export { toApiError };
