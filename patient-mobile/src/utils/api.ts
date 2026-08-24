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

function mutationIdempotencyKey(): string {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (typeof randomUuid === 'function') return randomUuid.call(globalThis.crypto);
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
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
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PATCH', 'DELETE'].includes(method) && !headers.has('idempotency-key')) {
    headers.set('idempotency-key', mutationIdempotencyKey());
  }

  // S4: bounded waits — a hanging request must never freeze a screen indefinitely.
  const REQUEST_TIMEOUT_MS = 20000;
  const doFetch = async (): Promise<Response> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...options, headers, signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  let response: Response;
  try {
    response = await doFetch();
  } catch (e: any) {
    const isGet = method === 'GET';
    // S4: exactly ONE automatic retry, and only for idempotent GETs —
    // never replay mutations (booking/payment) blindly: the server may have
    // received the first attempt; replaying risks duplicate booking/payment.
    if (isGet && e?.name !== 'AbortError') {
      await new Promise(r => setTimeout(r, 1200));
      try { response = await doFetch(); }
      catch (e2: any) { throw new Error(e2?.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'OFFLINE_ERROR'); }
    } else {
      throw new Error(e?.name === 'AbortError' ? 'TIMEOUT_ERROR' : 'OFFLINE_ERROR');
    }
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

    // Handle missing/invalid token or auth error
    if (errorMsg.toLowerCase().includes('missing token') || response.status === 401 || response.status === 403) {
      console.warn(`[apiFetch] Auth error for endpoint: ${endpoint}`);
      try { await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN); } catch {}
      await clearLegacyTokenMirror();
      throw new Error(`AUTH_ERROR_${response.status}: ${errorMsg}`);
    }
    throw new Error(errorMsg);
  }

  try {
    return await response.json();
  } catch {
    throw new ApiContractError('invalid_response');
  }
}
