import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { setSessionCookies } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

function tokenPair(data: unknown) {
  const parsed = z.object({ token: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }) }).passthrough().safeParse(data);
  return parsed.success ? parsed.data.token : null;
}

const bodySchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(6).max(128),
  email: z.string().trim().email().max(320).optional(),
}).strict();

/** Converts the current guest session into a full account (zero-loss merge server-side). */
export async function POST(request: Request) {
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_convert_payload" }, { status: 400 });
  const store = await cookies(); const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const upstream = await callPatientApi("/auth/convert-guest", {
    method: "POST",
    headers: { "content-type": "application/json", ...(deviceId ? { "x-device-id": deviceId } : {}) },
    body: JSON.stringify(input.data),
  }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "guest_convert_failed", upstream.status);
  const tokens = tokenPair(data);
  if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });
  const response = NextResponse.json({ authenticated: true, guest: false });
  setSessionCookies(response, tokens, deviceId);
  return response;
}
