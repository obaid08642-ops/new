import { NextResponse } from "next/server";

/**
 * Web Bot Auth JWKS Directory (RFC 9421 / IETF WebBotAuth WG)
 * Public key directory for verifying HTTP message signatures sent by automated agents.
 */
const jwks = {
  keys: [
    {
      kty: "OKP",
      crv: "Ed25519",
      use: "sig",
      kid: "nabd-bot-key-2026-01",
      x: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrGwu49287PU",
      alg: "EdDSA",
    },
    {
      kty: "RSA",
      use: "sig",
      kid: "nabd-bot-key-rsa-2026",
      n: "u1Z8g4F6gM5y1x9...",
      e: "AQAB",
      alg: "RS256",
    }
  ]
};

export function GET() {
  return NextResponse.json(jwks, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
