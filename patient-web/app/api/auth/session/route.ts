import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames, setSessionCookies } from "@/lib/auth/cookies";
import { refreshSession } from "@/lib/auth/refresh-session";
import { callPatientApi } from "@/lib/api/upstream";

/**
 * "Is there a session?" probe. Not being signed in is an ANSWER here, not an error: it is 200 with
 * `authenticated: false`, so a page that only asks (the register form, to spot a guest) leaves no failed
 * request in the browser console. Any other upstream failure still passes its status through.
 *
 * An expired access token is not "anonymous" while the refresh token still works: the probe refreshes it once (the same
 * rotation the /api/patient proxy does) and sets the new cookies, so a screen that treats anonymous as "change nothing"
 * (the cart) never mistakes a signed-in patient for a guest.
 */
export async function GET() {
  const headers = { "cache-control": "no-store" };
  let token = (await cookies()).get(authCookieNames.access)?.value;
  let rotated: Awaited<ReturnType<typeof refreshSession>> = null;
  if (!token) {
    rotated = await refreshSession();
    if (!rotated) return NextResponse.json({ authenticated: false }, { headers });
    token = rotated.tokens.accessToken;
  }
  let upstream = await callPatientApi("/auth/me", { method: "GET" }, token);
  if (upstream.status === 401 && !rotated) {
    rotated = await refreshSession();
    if (rotated) upstream = await callPatientApi("/auth/me", { method: "GET" }, rotated.tokens.accessToken);
  }
  if (upstream.status === 401) return NextResponse.json({ authenticated: false }, { headers });
  const response = upstream.ok
    ? NextResponse.json({ authenticated: true, user: await upstream.json() }, { headers })
    : NextResponse.json({ authenticated: false }, { status: upstream.status, headers });
  if (rotated) setSessionCookies(response, rotated.tokens, rotated.deviceId);
  return response;
}
