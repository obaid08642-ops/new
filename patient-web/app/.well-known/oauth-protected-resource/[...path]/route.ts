import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

/** RFC 9728 protected-resource metadata: which authorization server(s) can
 *  issue tokens for the Nabd Plus patient API and which scopes exist. */
export function GET(request: Request) {
  const url = new URL(request.url);
  // Match resource requested by scanner (e.g., https://nabd.plus/ar or https://nabd.plus)
  const resource = url.searchParams.get("resource") || `${origin}${url.pathname.replace(/^\/\.well-known\/oauth-protected-resource/, "")}`.replace(/\/$/, "") || origin;

  const doc = {
    resource: resource || origin,
    authorization_servers: [origin],
    scopes_supported: ["patient", "public", "catalog:read"],
    bearer_methods_supported: ["header"],
    resource_documentation: `${origin}/auth.md`,
  };

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
