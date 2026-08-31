import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
const api = (process.env.NABD_API_BASE_URL || "https://api.nabd.plus/api/v1").replace(/\/$/, "");

/** RFC 9728 protected-resource metadata: which authorization server(s) can
 *  issue tokens for the Nabd Plus patient API and which scopes exist. */
const doc = {
  resource: api,
  authorization_servers: [origin],
  scopes_supported: ["patient"],
  bearer_methods_supported: ["header"],
} as const;

export function GET() {
  return NextResponse.json(doc, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=900, stale-while-revalidate=3600", "Content-Type": "application/json; charset=utf-8" },
  });
}
