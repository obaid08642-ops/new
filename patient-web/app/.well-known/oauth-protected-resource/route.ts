import { NextResponse } from "next/server";
import { getOAuthDocument } from "@/lib/api/agent-oauth-server";

/** RFC 9728 metadata. The only OAuth-protected resource is the MCP endpoint (AC-1); the patient
 *  web itself uses session cookies, not bearer tokens. Served as the backend states it. */
export async function GET() {
  const upstream = await getOAuthDocument("protected-resource");
  const doc = upstream.ok ? await upstream.json().catch(() => null) : null;
  if (!doc) return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  return NextResponse.json(doc, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
