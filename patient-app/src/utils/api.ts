import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';
import { config } from '../core/config';

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

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
  if (MUTATING_METHODS.has(String(options.method || 'GET').toUpperCase()) && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', newIdempotencyKey());
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (e: any) {
    throw new Error(e?.name === 'AbortError' ? 'REQUEST_ABORTED' : 'OFFLINE_ERROR');
  }

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
      console.warn(`[apiFetch] Auth error for endpoint: ${endpoint}`);
      try { await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN); } catch {}
      await clearLegacyTokenMirror();
      throw new Error(`AUTH_ERROR_${response.status}: ${errorMsg}`);
    }
    if (response.status === 403) throw new Error(`AUTH_ERROR_403: ${errorMsg}`);
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
}
