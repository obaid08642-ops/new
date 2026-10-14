import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';

import { storeAuthSession } from '../../utils/api';
import { guestLogin, loginSuccess } from '../store/slices/authSlice';
import type { User } from '../types';
import { decodeJwt } from './jwt';

/** What POST /auth/login, /auth/register and /auth/social-login answer: `{ user, token: { accessToken, refreshToken } }`. */
export interface AuthResponse {
  user?: unknown;
  token?: string | { accessToken?: string; refreshToken?: string } | null;
}

export type SessionResult = { ok: true; token: string; role: string } | { ok: false; reason: 'no_token' | 'not_stored' };

/**
 * The one way a patient session starts after a password login, a social login or a finished registration:
 * both tokens go to secure storage (never to AsyncStorage), then the auth slice learns of the session
 * (`loginSuccess` clears `isGuest`, so the guest guard and the push registration, which both read the slice, see the
 * signed-in user). When secure storage refuses, nothing is claimed.
 */
export async function startSession(res: AuthResponse | null | undefined, dispatch: Dispatch<UnknownAction>): Promise<SessionResult> {
  const accessToken = typeof res?.token === 'string' ? res.token : res?.token?.accessToken || null;
  if (!accessToken) return { ok: false, reason: 'no_token' };
  const stored = await storeAuthSession(res?.token);
  if (!stored) return { ok: false, reason: 'not_stored' };
  const decoded = decodeJwt(accessToken) || {};
  const refreshToken = typeof res?.token === 'object' && res.token ? res.token.refreshToken : undefined;
  const user = (res?.user && typeof res.user === 'object' ? res.user : { id: decoded.sub, role: decoded.role || 'patient' }) as User;
  dispatch(loginSuccess({ user, token: accessToken, refreshToken }));
  return { ok: true, token: accessToken, role: decoded.role || 'patient' };
}

/**
 * The auth slice is not persisted (it is blacklisted from the store's persistence), so after a restart it knows
 * nothing about the session that is stored: the guest guard sees "not a guest" and the push registration, which waits
 * for `isAuthenticated`, never runs. The splash calls this with the stored tokens: it reads who the access token
 * belongs to (its claims) and starts the slice as that guest or patient. Null when the token is not readable.
 */
export function restoreSession(accessToken: string | null | undefined, refreshToken?: string | null): ReturnType<typeof loginSuccess> | ReturnType<typeof guestLogin> | null {
  if (!accessToken) return null;
  const claims = decodeJwt(accessToken);
  const id = claims?.sub || claims?.id;
  if (!claims || !id) return null;
  if (claims.is_guest === true || claims.role === 'guest') {
    return guestLogin({ user: { id, role: 'guest' } as unknown as User, token: accessToken });
  }
  return loginSuccess({ user: { id, role: claims.role || 'patient', phone: claims.phone } as unknown as User, token: accessToken, refreshToken: refreshToken || undefined });
}
