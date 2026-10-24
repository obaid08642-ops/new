import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames, setSessionCookies } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const bodySchema = z.object({ current_password: z.string().min(1).max(200), new_password: z.string().min(10).max(200) }).strict();
const tokensSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().min(1) });

/**
 * POST /users/me/change-password. The backend ends the other sessions and answers with a fresh token pair for this one;
 * the pair replaces the cookies, so the person stays signed in on this browser.
 */
export async function POST(request: Request) {
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_password_payload" }, { status: 400 });
  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const upstream = await callPatientApi("/users/me/change-password", {
    method: "POST",
    headers: { "content-type": "application/json", ...(deviceId ? { "x-device-id": deviceId } : {}) },
    body: JSON.stringify(input.data),
    cache: "no-store",
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "password_change_failed", upstream.status);
  const response = NextResponse.json({ changed: true }, { headers: { "cache-control": "no-store" } });
  const tokens = tokensSchema.safeParse(data);
  if (tokens.success) setSessionCookies(response, { accessToken: tokens.data.access_token, refreshToken: tokens.data.refresh_token }, deviceId || crypto.randomUUID());
  return response;
}
