import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookies } from "@/lib/auth/cookies";
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
  const deviceId = request.headers.get("x-nabd-device-id") || crypto.randomUUID();
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
