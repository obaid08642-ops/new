import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames, setSessionCookies } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

function tokenPair(data: unknown) {
  const parsed = z.object({ token: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }) }).passthrough().safeParse(data);
  return parsed.success ? parsed.data.token : null;
}

/**
 * Guest sign-in: creates (or reuses, per device) a device-bound guest account.
 * The guest token carries is_guest so guarded patient surfaces can restrict
 * sensitive areas (insurance, family) exactly like the mobile app.
 */
export async function POST(request: Request) {
  // 21.1: the device id is the identity of the guest. The browser sends it in a header (localStorage), and the BFF also keeps it
  // in an HttpOnly cookie, so a call without the header (a second tab, a cleared storage) still reaches the SAME guest instead of
  // opening a new one every time.
  const cookieDevice = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${authCookieNames.device}=([^;]+)`))?.[1];
  const plain = (v: string | null | undefined) => (v && /^[A-Za-z0-9._:-]{8,128}$/.test(v) ? v : "");
  const deviceId = plain(request.headers.get("x-nabd-device-id")) || plain(cookieDevice && decodeURIComponent(cookieDevice)) || crypto.randomUUID();
  const upstream = await callPatientApi("/auth/guest", {
    method: "POST",
    headers: { "content-type": "application/json", "x-device-id": deviceId },
    body: JSON.stringify({}),
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "guest_login_failed", upstream.status);
  const tokens = tokenPair(data);
  if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });
  const response = NextResponse.json({ authenticated: true, guest: true });
  setSessionCookies(response, tokens, deviceId);
  return response;
}
