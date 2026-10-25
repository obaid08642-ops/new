import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookies } from "@/lib/auth/cookies";
import { isNonPatientRole, wrongAppResponse } from "@/lib/auth/wrong-app";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { guestMergeHeaders } from "@/lib/auth/guest-merge";

const socialSchema = z.object({
  provider: z.enum(["google", "apple", "x", "snapchat"]),
  // Google access token / Apple identity token
  token: z.string().min(10).max(8192).optional(),
  // X / Snapchat: the authorization code, the PKCE verifier and the redirect URI of the authorize request (the backend exchanges them)
  code: z.string().min(1).max(2048).optional(),
  code_verifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/).optional(),
  redirect_uri: z.string().url().max(512).optional(),
  email: z.string().email().max(320).optional(),
  name: z.string().trim().min(1).max(160).optional(),
}).refine((v) => (v.provider === "x" || v.provider === "snapchat" ? Boolean(v.code && v.code_verifier && v.redirect_uri) : Boolean(v.token)), { message: "invalid_social_payload" });

function tokenPair(data: unknown) {
  const parsed = z.object({ token: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }) }).passthrough().safeParse(data);
  return parsed.success ? parsed.data.token : null;
}

export async function POST(request: Request) {
  const input = socialSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_social_payload" }, { status: 400 });
  const upstream = await callPatientApi("/auth/social-login", { method: "POST", headers: await guestMergeHeaders({ "content-type": "application/json" }), body: JSON.stringify(input.data) });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "social_login_failed", upstream.status);
  if (isNonPatientRole(data)) return wrongAppResponse();
  const tokens = tokenPair(data);
  if (!tokens) return NextResponse.json({ message: "unexpected_auth_response" }, { status: 502 });
  const response = NextResponse.json({ authenticated: true });
  setSessionCookies(response, tokens, request.headers.get("x-nabd-device-id") || crypto.randomUUID());
  return response;
}
