import { apiFetch, storeAuthSession } from '../../utils/api';
import { STORAGE_KEYS } from '../constants';
import { getDeviceId } from './deviceId';
import { decodeJwt } from './jwt';
import type { User } from '../types';
import { secureGet } from './security';

export interface GuestSession {
  user: User;
  token: string;
}

/**
 * A REAL device-bound guest account from the backend (POST /auth/guest with the stable `x-device-id`).
 * The same device always gets the same guest account, so a guest's orders and history persist and merge
 * into the account when they register. Throws when the backend gives no usable token.
 */
export async function createGuestSession(): Promise<GuestSession> {
  const deviceId = await getDeviceId();
  const res = await apiFetch('/auth/guest', {
    method: 'POST',
    headers: { 'x-device-id': deviceId },
    body: JSON.stringify({}),
    skipAuth: true,
  });
  const token = typeof res?.token === 'string' ? res.token : res?.token?.accessToken || null;
  if (!token) throw new Error('guest_session_failed');
  const stored = await storeAuthSession(res?.token);
  if (!stored) throw new Error('guest_session_not_stored');
  const decoded = decodeJwt(token) || {};
  // A guest has no phone, wallet or points; the backend user (or the token's subject) is what the app keeps.
  return { user: (res?.user || { id: decoded.sub, role: 'guest', name: 'زائر' }) as User, token };
}

/**
 * First launch with no session at all: open the guest session silently so Home and the other tabs load their
 * data without the "sign in" error banner (owner decision B2, 2026-10-06). Does nothing when any session
 * (patient or guest) is already stored. Never throws: if the backend is unreachable the app opens as before
 * and the next launch tries again.
 */
export async function ensureGuestSession(): Promise<GuestSession | null> {
  try {
    const existing = await secureGet(STORAGE_KEYS.AUTH_TOKEN).catch(() => null);
    if (existing) return null;
    return await createGuestSession();
  } catch {
    return null;
  }
}
