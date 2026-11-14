/**
 * The bridge from the HTTPS redirect URI Snapchat requires to the app's own scheme. Snapchat Login Kit accepts HTTPS redirects only, so the
 * app sends it to https://<site>/<locale>/login/app-callback; that page reads `code` and `state` and hands them to
 * `nabdplus://login/app-callback`. This is the ONLY place it can send anyone: the scheme and path are fixed here, only the two values
 * (or the provider's `error` word) vary, and each must look like what an OAuth server sends.
 */
export const APP_CALLBACK_TARGET = "nabdplus://login/app-callback";

/** What an authorization code or state may look like: URL-safe base64 and RFC 3986 unreserved characters, plus = + / of plain base64. */
const VALUE = /^[A-Za-z0-9._~\-+/=]{1,2048}$/;
const ERROR_WORD = /^[a-z_]{1,64}$/;

const one = (v: string | string[] | undefined): string | null => (typeof v === "string" ? v : null);

/** The deep link to open, or null when the query is not a code+state pair (or an `error` with its state) of the expected shape. */
export function appCallbackTarget(query: { code?: string | string[]; state?: string | string[]; error?: string | string[] }): string | null {
  const state = one(query.state);
  if (!state || !VALUE.test(state)) return null;
  const code = one(query.code);
  if (code !== null) {
    if (!VALUE.test(code)) return null;
    return `${APP_CALLBACK_TARGET}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
  }
  // the user said no at the provider: pass the word through so the app's browser closes instead of waiting
  const error = one(query.error);
  if (error && ERROR_WORD.test(error)) return `${APP_CALLBACK_TARGET}?error=${error}&state=${encodeURIComponent(state)}`;
  return null;
}
