import { NextResponse } from "next/server";
import { z } from "zod";
import { CODE_PROVIDERS } from "@/lib/auth/social-oauth";

const schema = z.object({
  provider: z.enum(["x", "snapchat"]),
  code: z.string().min(1).max(2048),
  verifier: z.string().min(43).max(128),
  redirectUri: z.string().url().max(512),
});

/** Exchanges the authorization code (PKCE) for the provider's access token; the browser cannot call these endpoints (CORS). */
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_social_payload" }, { status: 400 });
  const { provider, code, verifier, redirectUri } = input.data;
  const clientId = (provider === "x" ? process.env.NEXT_PUBLIC_X_CLIENT_ID : process.env.NEXT_PUBLIC_SNAPCHAT_CLIENT_ID) || "";
  if (!clientId) return NextResponse.json({ message: "social_provider_unconfigured" }, { status: 503 });
  const res = await fetch(CODE_PROVIDERS[provider].token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, code, redirect_uri: redirectUri, code_verifier: verifier }),
    cache: "no-store",
  }).catch(() => null);
  const data = res ? await res.json().catch(() => null) : null;
  const token = data && typeof data === "object" ? (data as { access_token?: unknown }).access_token : null;
  if (!res || !res.ok || typeof token !== "string" || !token) return NextResponse.json({ message: "social_exchange_failed" }, { status: 502 });
  return NextResponse.json({ token });
}
