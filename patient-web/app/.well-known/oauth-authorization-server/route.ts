import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

/** RFC 8414 metadata for the current Nabd Plus web auth entry points.
 *  Full OIDC provider (jwks, id tokens) is a roadmap item; these are the
 *  real interactive endpoints the patient web uses today. */
const doc = {
  issuer: origin,
  authorization_endpoint: `${origin}/api/auth/login`,
  token_endpoint: `${origin}/api/auth/session/exchange`,
  registration_endpoint: `${origin}/api/auth/register`,
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code", "refresh_token"],
  token_endpoint_auth_methods_supported: ["none"],
  service_documentation: `${origin}/auth.md`,
  agent_auth: {
    skill: `${origin}/auth.md`,
    register_uri: `${origin}/api/auth/register`,
    claim_uri: `${origin}/api/auth/otp/request`,
    supported_identity_types: ["email", "phone", "anonymous"],
    supported_credential_types: ["session_cookie", "bearer_token", "otp"],
    identity_types_supported: ["email", "phone", "anonymous"],
    anonymous: {
      credential_types_supported: ["session_cookie", "anonymous_token"],
      claim_uri: `${origin}/api/auth/guest`
    }
  },
  scopes_supported: ["patient", "public", "catalog:read"],
} as const;

export function GET() {
  return NextResponse.json(doc, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=900, stale-while-revalidate=3600", "Content-Type": "application/json; charset=utf-8" },
  });
}
