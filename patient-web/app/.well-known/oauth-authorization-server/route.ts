import { NextResponse } from "next/server";
import { getOAuthDocument } from "@/lib/api/agent-oauth-server";

/** RFC 8414 metadata of the agent authorization server (AC-1). The issuer is this site; the
 *  document comes from the backend that runs the endpoints, so every URL in it is real. */
export async function GET() {
  const upstream = await getOAuthDocument("metadata");
  const doc = upstream.ok ? await upstream.json().catch(() => null) : null;
  if (!doc) return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
  return NextResponse.json(doc, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=900, stale-while-revalidate=3600", "Content-Type": "application/json; charset=utf-8" },
  });
}
