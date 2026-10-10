import { NextResponse } from "next/server";
import { hintFromAccessToken, serializeSessionHint, SESSION_HINT_COOKIE, SESSION_HINT_MAX_AGE, type SessionHint } from "@/lib/auth/session-hint";

export const authCookieNames = { access: "nabd_access", refresh: "nabd_refresh", device: "nabd_device" } as const;
/** Where the one-time code of a new registration was sent: set by /api/auth/register, read by the /otp page, cleared by the session exchange. */
export const otpIdentifierCookie = "nabd_otp_identifier";
type TokenPair = { accessToken: string; refreshToken: string };
const commonCookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
/** The readable hint (no token, not HttpOnly): lets the browser know who is signed in without asking /api/auth/session (issue 363). */
const hintCookie = { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
export function setSessionHint(response: NextResponse, hint: SessionHint) {
  response.cookies.set(SESSION_HINT_COOKIE, serializeSessionHint(hint), { ...hintCookie, maxAge: SESSION_HINT_MAX_AGE });
}
export function setSessionCookies(response: NextResponse, tokens: TokenPair, deviceId: string) {
  response.cookies.set(authCookieNames.access, tokens.accessToken, { ...commonCookie, maxAge: 60 * 60 });
  response.cookies.set(authCookieNames.refresh, tokens.refreshToken, { ...commonCookie, maxAge: 60 * 60 * 24 * 14 });
  response.cookies.set(authCookieNames.device, deviceId, { ...commonCookie, maxAge: 60 * 60 * 24 * 14 });
  const hint = hintFromAccessToken(tokens.accessToken);
  if (hint) setSessionHint(response, hint);
}
export function clearSessionCookies(response: NextResponse) {
  for (const name of Object.values(authCookieNames)) response.cookies.set(name, "", { ...commonCookie, maxAge: 0 });
  response.cookies.set(SESSION_HINT_COOKIE, "", { ...hintCookie, maxAge: 0 });
}
