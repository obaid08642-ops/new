import { secureDelete, secureGet, secureSet } from '../src/utils/security';
import { apiFetch, BASE_URL, FASTAPI_BASE_URL, R2_PUBLIC_URL } from '../src/utils/api';
import { STORAGE_KEYS } from '../src/constants';

/**
 * 15.1 — DEPRECATED SHIM. Do not import from here.
 *
 * This file used to hold a second, independent `apiFetch` (an axios wrapper
 * around `HttpClient`). That duplication is gone: the one client now lives in
 * `src/services/http`, and `src/utils/api.ts` is its only public face. The
 * re-exports below exist so the three call sites that still point here
 * (`app/(auth)/login.tsx`, `app/(auth)/welcome.tsx`, and
 * `src/core/platform/auth/SessionManager.ts` for `BASE_URL`) keep resolving while
 * they are migrated. No network behaviour is defined here.
 */

export { apiFetch, BASE_URL, FASTAPI_BASE_URL, R2_PUBLIC_URL };

const TOKEN_KEYS = [STORAGE_KEYS.AUTH_TOKEN, 'userToken'];

async function getStoredToken(): Promise<string | null> {
  for (const key of TOKEN_KEYS) {
    try {
      const token = await secureGet(key);
      if (token) return token;
    } catch {
      // A native client without SecureStore is unauthenticated, never downgraded
      // to plaintext AsyncStorage token retrieval.
      return null;
    }
  }
  return null;
}

async function clearStoredSession(): Promise<void> {
  for (const key of [...TOKEN_KEYS, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER_DATA]) {
    try { await secureDelete(key); } catch { /* best-effort logout cleanup */ }
  }
}

/** Store the session tokens after a successful login/register. */
export async function storeAuthSession(tokenPayload: any): Promise<string | null> {
  const accessToken =
    typeof tokenPayload === 'string' ? tokenPayload : tokenPayload?.accessToken || null;
  const refreshToken =
    typeof tokenPayload === 'object' ? tokenPayload?.refreshToken : undefined;

  if (!accessToken) return null;

  try {
    await secureSet(STORAGE_KEYS.AUTH_TOKEN, accessToken);
    if (refreshToken) await secureSet(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    return accessToken;
  } catch {
    // Do not claim a durable authenticated session when secure storage failed.
    await clearStoredSession();
    return null;
  }
}
