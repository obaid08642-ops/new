/**
 * What the user reads when a request fails. The backend answers in English ("Invalid credentials",
 * "OTP expired or not requested" ...) and the two api helpers pass that text through (or add their own fallbacks), so
 * a sign-in screen showed an English sentence to an Arabic or Urdu reader. This maps the messages the backend and the
 * helpers are known to send to translation KEYS (src/i18n/locales/*.json, all six languages; the component that draws
 * the text resolves the key through the i18n layer), and any message it does not know to the screen's own generic key.
 * Nothing the server wrote is ever shown raw.
 */

const KNOWN: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid credentials/i, 'errors.invalidCredentials'],
  [/account disabled|user not found or disabled/i, 'errors.accountDisabled'],
  [/otp expired or not requested|otp_expired/i, 'errors.otpExpired'],
  [/invalid otp code|otp_invalid/i, 'errors.otpInvalid'],
  [/too many otp requests|otp_rate_limited|password_reset_rate_limited/i, 'errors.otpRateLimited'],
  [/too many (otp verification|invalid) attempts|otp_locked/i, 'errors.otpLocked'],
  [/too many requests|throttl/i, 'errors.tooManyRequests'],
  [/email already registered/i, 'errors.emailRegistered'],
  [/phone already registered/i, 'errors.phoneRegistered'],
  [/identifier_already_registered/i, 'errors.accountRegistered'],
  [/user not found/i, 'errors.userNotFound'],
  [/otp_channel_unavailable/i, 'errors.otpUnavailable'],
  [/code_required|otp_required/i, 'errors.codeRequired'],
  [/offline_error|network error|offline_mutation_pending/i, 'errors.offline'],
  // the Arabic fallbacks the root api helper (utils/api.ts) writes itself for 404, 429, 5xx and no connection
  [/لا يوجد اتصال/, 'errors.offline'],
  [/محاولات كثيرة/, 'errors.tooManyRequests'],
  [/خطأ في الخادم/, 'errors.server'],
  [/العنصر المطلوب غير موجود/, 'errors.notFound'],
];

/**
 * A translation key for a failed request: a known message mapped, otherwise `fallback` (a key of the screen's own).
 * `error` is whatever was thrown (an Error, or a string); the result is shown through the i18n layer.
 */
export function serverMessage(error: unknown, fallback: string): string {
  const raw = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  if (!raw) return fallback;
  for (const [pattern, key] of KNOWN) if (pattern.test(raw)) return key;
  return fallback;
}
