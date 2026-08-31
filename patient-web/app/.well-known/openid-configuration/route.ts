import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

/** OIDC discovery (minimal, truthful). jwks_uri/id_token are published when a
 *  real OIDC provider/keys endpoint is configured; until then agents rely on
 *  the session-exchange flow described in /auth.md. */
const doc = {
  issuer: origin,
  authorization_endpoint: `${origin}/api/auth/login`,
  token_endpoint: `${origin}/api/auth/session/exchange`,
  registration_endpoint: `${origin}/api/auth/register`,
  response_types_supported: ["code"],
  subject_types_supported: ["public"],
  scopes_supported: ["openid", "patient"],
} as const;

export function GET() {
  return NextResponse.json(doc, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=900, stale-while-revalidate=3600", "Content-Type": "application/json; charset=utf-8" },
  });
}
