import { NextResponse } from "next/server";

// MCP Server Card — وصف صادق: لا يوجد خادم MCP فعلي بعد؛ يُعلن عن نقاط الاكتشاف الموجودة فقط.
export function GET() {
  return NextResponse.json({
    schema: "https://modelcontextprotocol.io/server-card/v0",
    name: "Nabd Plus Patient API",
    description: "Healthcare platform discovery surface: product/search catalog, OAuth metadata, OpenAPI spec.",
    version: "1.0.0",
    capabilities: { tools: false, resources: true, prompts: false },
    endpoints: {
      openapi: "/.well-known/openapi.json",
      oauth_authorization_server: "/.well-known/oauth-authorization-server",
      ai_catalog: "/.well-known/ai-catalog.json",
    },
    status: "discovery-only",
  }, { headers: { "cache-control": "public, max-age=3600" } });
}
