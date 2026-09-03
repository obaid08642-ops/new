import { NextResponse } from "next/server";

export function GET() {
  const mcpUrl = process.env.MCP_PUBLIC_URL || "https://mcp.nabd.plus";

  return NextResponse.json(
    {
      schema: "https://modelcontextprotocol.io/server-card/v0",
      name: "Nabd Plus Healthcare MCP Server",
      description:
        "Unified Model Context Protocol (MCP) server for Saudi healthcare discovery, consultation booking, and pharmacy services.",
      version: "1.0.0",
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
      endpoints: {
        mcp_rpc: `${mcpUrl}/api/v1/mcp`,
        tools: `${mcpUrl}/api/v1/mcp/tools`,
        server_card: `${mcpUrl}/api/v1/mcp/server-card`,
        openapi: "/.well-known/openapi.json",
        ai_catalog: "/.well-known/ai-catalog.json",
      },
      tools: [
        "search_entities",
        "get_entity_detail",
        "find_alternatives",
        "check_availability",
        "prepare_transaction",
      ],
      status: "active",
      governance: {
        prescription_enforcement: "strict_sfda_compliant",
        booking_confirmation: "user_approval_required",
      },
    },
    { headers: { "cache-control": "public, max-age=3600" } }
  );
}
