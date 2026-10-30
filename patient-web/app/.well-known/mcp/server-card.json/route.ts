import { NextResponse } from "next/server";

/**
 * AC-2: the public copy of the MCP server card (the backend serves the same card at
 * /api/v1/mcp/server-card). It names the Streamable HTTP transport plus the OAuth
 * requirement and scopes, so an assistant knows which tools are anonymous and which
 * need a patient sign-in (AC-1). URLs here must all resolve (ai-discovery-contract).
 */
export function GET() {
  const mcpUrl = (process.env.MCP_PUBLIC_URL || "https://mcp.nabd.plus").replace(/\/$/, "");
  const site = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

  return NextResponse.json(
    {
      schema: "https://modelcontextprotocol.io/server-card/v0",
      name: "Nabd Plus Healthcare MCP Server",
      description:
        "Unified Model Context Protocol (MCP) server for Saudi healthcare discovery, consultation booking, and pharmacy services.",
      version: "1.0.0",
      protocol: {
        transport: "streamable-http",
        versions_supported: ["2025-06-18", "2024-11-05"],
        json_responses: true,
        sse: false,
        endpoint: `${mcpUrl}/api/v1/mcp`,
      },
      capabilities: {
        tools: true,
        // AC-5: no resources or prompts exist on this endpoint (tools only).
        resources: false,
        prompts: false,
      },
      endpoints: {
        mcp_rpc: `${mcpUrl}/api/v1/mcp`,
        tools: `${mcpUrl}/api/v1/mcp/tools`,
        server_card: `${mcpUrl}/api/v1/mcp/server-card`,
        openapi: "/.well-known/openapi.json",
        ai_catalog: "/.well-known/ai-catalog.json",
      },
      authorization: {
        type: "oauth2",
        authorization_server: site,
        authorization_server_metadata: `${site}/.well-known/oauth-authorization-server`,
        // Relative on purpose: the RFC 9728 document is discovered through the 401
        // WWW-Authenticate header on the MCP endpoint (acceptance case 4).
        resource_metadata_path: "/.well-known/oauth-protected-resource/api/v1/mcp",
        public_tools_anonymous: true,
        scopes: {
          "agent:read": "Read the patient's own orders, bookings and pharmacy offers.",
          "agent:order": "Send an OTC pharmacy request and read its offers. The patient selects an offer and pays on Nabd Plus.",
          "agent:book": "Hold a consultation, lab, radiology or nursing slot. The patient confirms and pays on Nabd Plus.",
        },
        authenticated_tools: {
          my_orders: "agent:read",
          my_bookings: "agent:read",
          list_offers: "agent:read",
          create_pharmacy_request: "agent:order",
          choose_offer_link: "agent:order",
          hold_consultation: "agent:book",
          hold_lab: "agent:book",
          hold_nursing: "agent:book",
          hold_radiology: "agent:book",
          cancel_hold: "agent:book",
        },
      },
      tools: [
        "search_entities",
        "get_entity_detail",
        "find_alternatives",
        "check_availability",
        "prepare_transaction",
        "check_prescription_required",
        "search_medicines",
        "search_doctors",
        "search_facilities",
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
