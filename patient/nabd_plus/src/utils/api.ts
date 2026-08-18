import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';
import { getDeviceId } from './deviceId';
import { config } from '../core/config';

// All runtime URLs resolve through ConfigManager, including explicit local-dev
// settings. This legacy fetch client must not maintain a parallel localhost fallback.
export const BASE_URL = config.apiBaseUrl;
export const FASTAPI_BASE_URL = config.fastapiBaseUrl;
export const R2_PUBLIC_URL = config.cdnUrl;

async function getToken(): Promise<string | null> {
  const valid = (t: string | null): string | null =>
    t && t !== '[object Object]' && t.length > 10 ? t : null;
  try {
    const t = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    if (valid(t)) return t;
  } catch { /* fall through to AsyncStorage mirror */ }
  try {
    const t = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (valid(t)) return t;
    if (t) await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN); // corrupted → purge
  } catch { /* ignore */ }
  return null;
}

async function saveToken(token: string): Promise<void> {
  // Guard: AsyncStorage/SecureStore only accept strings — refuse anything else
  // and clean up a previously corrupted "[object Object]" value.
  if (typeof token !== 'string' || !token || token === '[object Object]') {
    try { await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN); } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch {
    try { await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token); } catch {}
  }
}

// ---------------------------------------------------------------------------
// Auto guest provisioning: any call made without a valid token transparently
// obtains a REAL device-bound guest session from the backend and retries once.
// This eliminates the AUTH_ERROR_401 floods for guests — they can use every
// service (cart, orders, bookings, wallet, loyalty…) under their guest account.
// ---------------------------------------------------------------------------
let guestProvisionPromise: Promise<string | null> | null = null;
export async function ensureGuestToken(): Promise<string | null> {
  if (guestProvisionPromise) return guestProvisionPromise;
  guestProvisionPromise = (async () => {
    try {
      const deviceId = await getDeviceId();
      const res = await fetch(`${BASE_URL}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      // Backend returns { user, token: { accessToken, refreshToken } } — extract the
      // string access token; never store the wrapper object (breaks AsyncStorage).
      const raw = data?.token;
      const tokenStr =
        typeof raw === 'string' ? raw :
        (raw && typeof raw === 'object' ? (raw.accessToken || raw.access_token || raw.token) : null);
      if (typeof tokenStr === 'string' && tokenStr.length > 10) {
        await saveToken(tokenStr);
        try { await AsyncStorage.setItem(STORAGE_KEYS.GUEST_MODE ?? '@nabdah_guest', 'true'); } catch {}
        return tokenStr;
      }
    } catch { /* offline — no guest token */ }
    return null;
  })();
  try {
    return await guestProvisionPromise;
  } finally {
    guestProvisionPromise = null;
  }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = await getToken();
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const isAuthEndpoint = endpoint.startsWith('/auth/');

  // No token at all → provision a device-bound guest session (except auth calls).
  if (!token && !isAuthEndpoint) {
    token = await ensureGuestToken();
  }

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
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
    const isGet = !options.method || options.method.toUpperCase() === 'GET';
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
      try {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      } catch {}
      // Stale/expired token → drop into a fresh device-bound guest session and
      // retry this request ONCE (safe: the 401 means the server never ran it).
      const alreadyRetried = (options as any).__guestRetried === true;
      if (!alreadyRetried && !isAuthEndpoint) {
        const guestToken = await ensureGuestToken();
        if (guestToken) {
          return apiFetch<T>(endpoint, { ...options, __guestRetried: true } as any);
        }
      }
      throw new Error(`AUTH_ERROR_${response.status}: ${errorMsg}`);
    }
    throw new Error(errorMsg);
  }

  try {
    return await response.json();
  } catch {
    return { ok: true } as unknown as T;
  }
}
