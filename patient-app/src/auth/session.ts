import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';
import { config } from '../core/config';

/**
 * The patient session on the device: where it is stored, how it ends, and how it is renewed.
 *
 * - `clearStoredSession` removes every token the app keeps (secure storage, and the migration mirror in AsyncStorage). Signing out
 *   used to clear only the Redux slice, so the next launch read the tokens again and signed the person back in.
 * - `refreshStoredSession` swaps the refresh token for a new pair once (several requests that fail together share one refresh), so the
 *   one-hour access token does not end the session for someone who is still using the app.
 * - `notifySessionExpired` tells the app (a handler registered at the root) that a real patient session is over: it signs out
 *   and opens the login screen instead of leaving every screen failing quietly.
 */
const TOKEN_KEYS = [STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER_DATA, 'userToken'];

export async function clearStoredSession(): Promise<void> {
  for (const key of TOKEN_KEYS) {
    try { await SecureStore.deleteItemAsync(key); } catch { /* best effort: a missing key is already clear */ }
  }
  try { await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN); } catch { /* migration mirror only */ }
}

let expiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  expiredHandler = handler;
}

export function notifySessionExpired(): void {
  try { expiredHandler?.(); } catch { /* the screen that failed must not break on a failed redirect */ }
}

/** The pair the backend answers (`{ accessToken, refreshToken }` directly or under `token`), or null. */
export function tokensFromRefresh(body: unknown): { accessToken: string; refreshToken: string } | null {
  const top = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  const inner = top && typeof top.token === 'object' && top.token ? (top.token as Record<string, unknown>) : top;
  const accessToken = inner && typeof inner.accessToken === 'string' ? inner.accessToken : inner && typeof inner.access_token === 'string' ? inner.access_token : null;
  const refreshToken = inner && typeof inner.refreshToken === 'string' ? inner.refreshToken : inner && typeof inner.refresh_token === 'string' ? inner.refresh_token : null;
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

let refreshing: Promise<string | null> | null = null;

/** Renews the session with the stored refresh token. Returns the new access token, or null when it cannot be renewed. */
export function refreshStoredSession(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return null;
      const res = await fetchImpl(`${config.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const pair = tokensFromRefresh(await res.json().catch(() => null));
      if (!pair) return null;
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, pair.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, pair.refreshToken);
      return pair.accessToken;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * Signs the patient out: the server ends the refresh session of this device (best effort, bounded), then every stored token is
 * removed. The caller then resets the auth slice and opens the entry screen.
 */
export async function endPatientSession(fetchImpl: typeof fetch = fetch): Promise<void> {
  let refreshToken: string | null = null;
  try { refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN); } catch { /* signing out still clears */ }
  if (refreshToken) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 4000) : null;
    try {
      await fetchImpl(`${config.apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: controller?.signal,
      });
    } catch { /* offline or slow: the local sign-out must not wait for it */ } finally {
      if (timer) clearTimeout(timer);
    }
  }
  await clearStoredSession();
}
