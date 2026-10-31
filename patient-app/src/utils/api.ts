import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';
import { config } from '../core/config';
import { reportModuleRefusal } from './moduleSwitches';
import { decodeJwt } from './jwt';
import { clearStoredSession, notifySessionExpired, refreshStoredSession } from '../auth/session';
import { isOffline } from './isOffline';
import { MAX_RETRIES, guardedSignal, pause, planRetries, retryAfterTooLong, retryDelayMs, shouldRetryStatus, timeoutFor } from './requestPolicy';

// All runtime URLs resolve through ConfigManager, including explicit local-dev
// settings. This legacy fetch client must not maintain a parallel localhost fallback.
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

/** The endpoints that turn a guest session into a real account. */
const SESSION_ESTABLISHING = /^\/auth\/(login|register|social-login|session\/exchange)(\/|\?|$)/;

/**
 * Phase 21.2 — the guest ACCESS TOKEN this device is holding, or null when the
 * stored session is a real account.
 *
 * The token, not the guest's id: an id is visible to the pharmacy, in logs and
 * in screenshots, so sending one would let anybody who ever saw it claim that
 * guest's cart and orders. The backend verifies this token's signature and
 * burns it for the merge.
 */
/** Whether a signed-in session token is stored (no network call). */
export async function hasSession(): Promise<boolean> {
  return (await getToken()) !== null;
}

export async function currentGuestToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    if (!token || typeof token !== 'string' || token.length < 20) return null;
    const claims = decodeJwt(token);
    if (!claims) return null;
    if (claims.is_guest !== true && claims.role !== 'guest') return null;
    return token;
  } catch {
    return null;
  }
}

/**
 * The sign-in family. A 401 from one of these ("User not found", a wrong code) is the answer to that request, not a
 * statement about the stored session, so it must not delete the guest or patient token that is already there.
 */
export const isPublicAuthEndpoint = (endpoint: string): boolean =>
  /^\/auth\/(login|register|guest|social-login|send-otp|verify-otp|reset-password|refresh)(\/|\?|$)/.test(endpoint);

export function newIdempotencyKey(): string {
  const uuid = (globalThis as any).crypto?.randomUUID?.();
  return `app-${uuid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`}`;
}

/**
 * Saves a protected file (a lab booking's report) to the cache with the session token and returns its local uri, or
 * null when the server refuses it. The file is never fetched from a raw CDN url found in a payload.
 */
export async function downloadProtected(endpoint: string, filename: string): Promise<string | null> {
  const token = await getToken();
  const { fileManager } = await import('../services/FileManager');
  return fileManager.downloadFile(`${BASE_URL}${endpoint}`, filename, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

/** `timeoutMs` overrides the default for one call (15 s; 60 s for an upload; 45 s for the AI routes). */
export type ApiFetchOptions = RequestInit & { timeoutMs?: number };

export async function apiFetch<T = any>(endpoint: string, options: ApiFetchOptions = {}, afterRefresh = false): Promise<T> {
  const { timeoutMs, ...init } = options;
  options = init;
  let token = await getToken();
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  // Mutating routes marked @RequireIdempotency answer 400 idempotency_key_required without a key.
  // A caller that needs retry de-duplication passes its own stable key; otherwise one key per request.
  const callerSuppliedKey = headers.has('Idempotency-Key');
  if (MUTATING_METHODS.has(String(options.method || 'GET').toUpperCase()) && !callerSuppliedKey) {
    headers.set('Idempotency-Key', newIdempotencyKey());
  }
  // 21.2: signing in while a guest session is held carries the guest's own
  // token, so the backend can prove the session and move its data.
  if (SESSION_ESTABLISHING.test(endpoint) && !headers.has('x-guest-token')) {
    const guestToken = await currentGuestToken();
    if (guestToken) headers.set('x-guest-token', guestToken);
  }

  // 15.1: every request has a timeout, may be cancelled by the caller's signal, and is tried again only when that is safe.
  const plan = planRetries(options.method, callerSuppliedKey);
  const limit = timeoutFor(endpoint, options.body, timeoutMs);
  let response!: Response;
  let release: () => void = () => {};
  for (let attempt = 0; ; attempt++) {
    if (options.signal?.aborted) throw new Error('REQUEST_ABORTED');
    if (await isOffline()) throw new Error('OFFLINE_ERROR');
    const guard = guardedSignal(options.signal, limit);
    try {
      response = await fetch(url, { ...options, headers, signal: guard.signal });
    } catch {
      guard.cleanup();
      if (guard.callerAborted()) throw new Error('REQUEST_ABORTED');
      if (plan.retryTransport && attempt < MAX_RETRIES) {
        await pause(retryDelayMs(attempt), options.signal);
        continue;
      }
      throw new Error(guard.timedOut() ? 'REQUEST_TIMEOUT' : 'OFFLINE_ERROR');
    }
    const retryAfter = response.headers?.get?.('Retry-After');
    if (!response.ok && attempt < MAX_RETRIES && shouldRetryStatus(response.status, plan) && !retryAfterTooLong(retryAfter)) {
      guard.cleanup();
      await pause(retryDelayMs(attempt, retryAfter), options.signal);
      continue;
    }
    release = guard.cleanup;
    break;
  }

  try {
    if (!response.ok) {
      let errorMsg = 'api_error';
      try {
        const errData = await response.json();
        const m = errData?.message ?? errData?.error ?? null;
        // NestJS validation errors return message as ARRAY; some endpoints return
        // objects — always coerce to a string or .toLowerCase() crashes below.
        errorMsg = typeof m === 'string' ? m : (Array.isArray(m) ? m.join(', ') : (m ? JSON.stringify(m) : errorMsg));
      } catch {}
    
      // Only an invalid/expired session (401) ends it. A 403 means "not allowed to do this":
      // signing the user out for it would log them out of the whole app on one forbidden action.
      if (!isPublicAuthEndpoint(endpoint) && (errorMsg.toLowerCase().includes('missing token') || response.status === 401)) {
        // A signed-in patient whose access token ran out: renew it with the refresh token and repeat this request once.
        const wasPatient = !!token && !(await currentGuestToken());
        if (wasPatient && !afterRefresh && (await refreshStoredSession())) {
          return await apiFetch<T>(endpoint, { ...options, timeoutMs }, true);
        }
        console.warn(`[apiFetch] Auth error for endpoint: ${endpoint}`);
        await clearStoredSession();
        await clearLegacyTokenMirror();
        // The session is over (it cannot be renewed): the app signs out and opens the login screen. A guest token is simply dropped.
        if (wasPatient) notifySessionExpired();
        throw new Error(`AUTH_ERROR_${response.status}: ${errorMsg}`);
      }
      if (response.status === 403) {
        const refusal = new Error(`AUTH_ERROR_403: ${errorMsg}`);
        reportModuleRefusal(refusal);
        throw refusal;
      }
      throw new Error(errorMsg);
    }

    // A 2xx with no body (e.g. a GET with nothing to return) means "no data", not a broken
    // contract: treating it as an error made the orders hub report a failed section on every load.
    const text = await response.text();
    if (!text.trim()) return null as T;
    try {
      return JSON.parse(text);
    } catch {
      throw new ApiContractError('invalid_response');
    }
  } finally {
    release();
  }
}
