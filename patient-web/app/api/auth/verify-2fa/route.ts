import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookies } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";
const schema = z.object({ identifier: z.string().trim().min(3).max(320), code: z.string().trim().min(4).max(32) });
function tokenPair(data: unknown) { const parsed = z.object({ token: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }) }).passthrough().safeParse(data); return parsed.success ? parsed.data.token : null; }
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_2fa_payload" }, { status: 400 });
  const upstream = await callPatientApi("/auth/login/verify-2fa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "verification_failed" }, { status: upstream.status });
  const tokens = tokenPair(data);
  if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });
  const response = NextResponse.json({ authenticated: true });
  setSessionCookies(response, tokens, request.headers.get("x-nabd-device-id") || crypto.randomUUID());
  return response;
}
