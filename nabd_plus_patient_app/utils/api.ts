import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HttpClient } from '../src/services/HttpClient';
import { STORAGE_KEYS } from '../src/constants';

/**
 * M1-01 — REAL network client (replaces the former in-memory mock that returned
 * hardcoded data after a fake 800ms delay and never touched the network).
 *
 * The exported signature is intentionally unchanged (`apiFetch(endpoint, options)`)
 * so all 157 screens that were wired to the mock become live against the real
 * backend without per-screen rewrites.
 *
 * Behavior:
 *  - Injects the JWT from secure storage as `Authorization: Bearer <token>`.
 *  - `options.body` may be a JSON string (screens already JSON.stringify) or an object.
 *  - Returns the parsed response body directly (screens read res.data / arrays / res.token).
 *  - On 401: clears the stored session so the app falls back to the auth flow.
 *  - Throws Error with the server's message when available — no silent fake fallbacks.
 */

const TOKEN_KEYS = [STORAGE_KEYS.AUTH_TOKEN, 'userToken'];

async function getStoredToken(): Promise<string | null> {
  for (const key of TOKEN_KEYS) {
    try {
      const t = await SecureStore.getItemAsync(key);
      if (t) return t;
    } catch {
      // SecureStore unavailable (web) — fall through to AsyncStorage
    }
    try {
      const t = await AsyncStorage.getItem(key);
      if (t) return t;
    } catch {
      // ignore
    }
  }
  return null;
}

async function clearStoredSession(): Promise<void> {
  for (const key of [...TOKEN_KEYS, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER_DATA]) {
    try { await SecureStore.deleteItemAsync(key); } catch { /* ignore */ }
    try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
  }
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: string | Record<string, any>;
  headers?: Record<string, string>;
  /** Skip attaching the Authorization header (public endpoints) */
  skipAuth?: boolean;
  timeout?: number;
}

function normalizeError(err: any): Error {
  const serverMessage =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.data?.message;
  if (serverMessage) {
    return new Error(Array.isArray(serverMessage) ? serverMessage.join('، ') : String(serverMessage));
  }
  if (err?.response?.status === 404) return new Error('العنصر المطلوب غير موجود');
  if (err?.response?.status === 429) return new Error('محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة');
  if (err?.response?.status >= 500) return new Error('خطأ في الخادم — حاول مرة أخرى لاحقًا');
  if (!err?.response && err?.request) return new Error('لا يوجد اتصال بالإنترنت — تحقق من الشبكة');
  return new Error(err?.message || 'حدث خطأ غير متوقع');
}

export async function apiFetch<T = any>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();

  let data: any = undefined;
  if (options.body !== undefined && options.body !== null) {
    data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (!options.skipAuth) {
    const token = await getStoredToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await HttpClient.request({
      url: endpoint,
      method: method as any,
      data,
      headers,
      timeout: options.timeout,
    });
    return response.data as T;
  } catch (err: any) {
    if (err?.response?.status === 401 && !options.skipAuth) {
      await clearStoredSession();
    }
    throw normalizeError(err);
  }
}

/** Store the session tokens after a successful login/register. */
export async function storeAuthSession(tokenPayload: any): Promise<string | null> {
  const accessToken =
    typeof tokenPayload === 'string' ? tokenPayload : tokenPayload?.accessToken || null;
  const refreshToken =
    typeof tokenPayload === 'object' ? tokenPayload?.refreshToken : undefined;

  if (!accessToken) return null;

  try { await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, accessToken); }
  catch { await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken); }

  if (refreshToken) {
    try { await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken); }
    catch { await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken); }
  }
  return accessToken;
}
