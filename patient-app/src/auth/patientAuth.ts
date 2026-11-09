/** The patient sign-in calls: the canonical endpoints the web uses (otp/request, otp/verify, session/exchange-native, register with consents, password/forgot, password/reset). */
export type AuthApi = (endpoint: string, options?: { method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE'; body?: string; skipAuth?: boolean }) => Promise<any>;

export interface Consent { policy_id: string; version: string }
export interface SessionPair { accessToken: string; refreshToken: string }

// register and the exchange keep the stored guest bearer: the backend merges that guest into the account (guestMergeToken)
const post = (api: AuthApi, endpoint: string, body: unknown, keepGuest = false) =>
  api(endpoint, { method: 'POST', body: JSON.stringify(body), skipAuth: !keepGuest });

/** `identifier` is an e-mail or a phone: a phone gets +966 when it carries no country code. */
export function normalizeIdentifier(raw: string): string {
  const value = raw.trim();
  if (value.includes('@')) return value.toLowerCase();
  const digits = value.replace(/[\s()-]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  // a full Saudi number typed without the plus (966 + 9 digits): it is already international, not a local number
  if (/^966\d{9}$/.test(digits)) return `+${digits}`;
  return `+966${digits.replace(/^0+/, '')}`;
}

export function isValidIdentifier(raw: string): boolean {
  const value = raw.trim();
  if (value.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  return value.replace(/[\s()+-]/g, '').length >= 9;
}

/**
 * The consents the backend checks at sign-up: patient_terms and privacy_policy at their current versions (GET /legal/policies).
 * No policy configured: both at v1 (the backend then skips the check). Null: policies exist but neither required one does.
 */
export async function currentConsents(api: AuthApi): Promise<Consent[] | null> {
  const data = await api('/legal/policies', { skipAuth: true });
  const list: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  const pick = (key: string) => list.find((p): p is { key: string; version: string } =>
    !!p && typeof p === 'object' && (p as { key?: unknown }).key === key && typeof (p as { version?: unknown }).version === 'string'
    && (p as { requires_acceptance?: unknown }).requires_acceptance !== false);
  const chosen = ['patient_terms', 'privacy_policy'].map(pick).filter((p): p is { key: string; version: string } => !!p)
    .map((p) => ({ policy_id: p.key, version: p.version }));
  if (chosen.length) return chosen;
  return list.length ? null : [{ policy_id: 'patient_terms', version: 'v1' }, { policy_id: 'privacy_policy', version: 'v1' }];
}

export async function requestOtp(api: AuthApi, identifier: string): Promise<{ otp_no_channel: boolean }> {
  try {
    await post(api, '/auth/otp/request', { identifier: normalizeIdentifier(identifier) });
    return { otp_no_channel: false };
  } catch (e) {
    if (/otp_no_channel/.test(String((e as { message?: unknown })?.message ?? ''))) return { otp_no_channel: true };
    throw e;
  }
}

/** Verifies the code, then trades the single-use exchange token for the session pair. */
export async function verifyOtp(api: AuthApi, identifier: string, code: string): Promise<SessionPair> {
  const verified = await post(api, '/auth/otp/verify', { identifier: normalizeIdentifier(identifier), code });
  const exchangeToken = verified?.exchange_token;
  if (typeof exchangeToken !== 'string' || !exchangeToken) throw new Error('otp_invalid');
  const pair = await post(api, '/auth/session/exchange-native', { exchange_token: exchangeToken }, true);
  if (typeof pair?.access_token !== 'string' || typeof pair?.refresh_token !== 'string') throw new Error('otp_invalid');
  return { accessToken: pair.access_token, refreshToken: pair.refresh_token };
}

export async function registerPatient(api: AuthApi, input: { name: string; identifier: string; password: string; locale: string }): Promise<{ otp_sent: boolean }> {
  const consents = await currentConsents(api);
  if (!consents) throw new Error('registration_policy_configuration_missing');
  const res = await post(api, '/auth/register', {
    name: input.name.trim(), identifier: normalizeIdentifier(input.identifier), password: input.password, locale: input.locale, consents,
  }, true);
  return { otp_sent: res?.otp_sent !== false };
}

export const forgotPassword = (api: AuthApi, identifier: string) => post(api, '/auth/password/forgot', { identifier: normalizeIdentifier(identifier) });
export const resetPassword = (api: AuthApi, token: string, newPassword: string) => post(api, '/auth/password/reset', { reset_token: token, new_password: newPassword });

/**
 * The six code boxes after a change in box `index`: a pasted or auto-filled code (the whole code in one box, as the
 * SMS autofill does) is spread over the boxes from there, anything that is not a digit is dropped, and the result is
 * the new boxes plus the box that should take focus.
 */
export function applyOtpInput(boxes: readonly string[], text: string, index: number): { boxes: string[]; focus: number } {
  let digits = text.replace(/\D/g, '');
  // typing into a box that already holds a digit gives two characters: keep the new one
  if (digits.length === 2 && boxes[index] && text.length === 2) digits = digits.replace(boxes[index], '') || digits[1];
  const next = [...boxes];
  if (!digits) { next[index] = ''; return { boxes: next, focus: index }; }
  const placed = digits.length === 1 ? digits : digits.slice(0, boxes.length - index);
  for (let i = 0; i < placed.length; i++) next[index + i] = placed[i];
  return { boxes: next, focus: Math.min(index + placed.length, boxes.length - 1) };
}
