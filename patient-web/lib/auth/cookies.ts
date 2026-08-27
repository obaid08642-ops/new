import { NextResponse } from "next/server";

export const authCookieNames = { access: "nabd_access", refresh: "nabd_refresh", device: "nabd_device" } as const;
type TokenPair = { accessToken: string; refreshToken: string };
const commonCookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
export function setSessionCookies(response: NextResponse, tokens: TokenPair, deviceId: string) {
  response.cookies.set(authCookieNames.access, tokens.accessToken, { ...commonCookie, maxAge: 60 * 60 });
  response.cookies.set(authCookieNames.refresh, tokens.refreshToken, { ...commonCookie, maxAge: 60 * 60 * 24 * 14 });
  response.cookies.set(authCookieNames.device, deviceId, { ...commonCookie, maxAge: 60 * 60 * 24 * 14 });
}
export function clearSessionCookies(response: NextResponse) { for (const name of Object.values(authCookieNames)) response.cookies.set(name, "", { ...commonCookie, maxAge: 0 }); }
