import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

/**
 * Universal Commerce Protocol (UCP) Discovery Endpoint (ucp.dev)
 */
export function GET() {
  return NextResponse.json({
    ucp: {
      version: "2026-01",
      protocol_version: "1.0",
      services: ["catalog_discovery", "product_search", "availability_check"],
      capabilities: {
        search: true,
        catalog_browsing: true,
        pricing_inquiry: true,
        autonomous_checkout: false,
      },
      endpoints: {
        catalog: `${origin}/.well-known/ai-catalog.json`,
        openapi: `${origin}/openapi.json`,
        search: `${origin}/api/v1/public/products/search`,
      }
    },
    protocol_version: "1.0",
    merchant: "Nabd Plus",
    services: ["catalog_discovery", "product_search", "availability_check"],
    capabilities: {
      search: true,
      cart: false,
      checkout: false,
    },
    endpoints: {
      catalog: `${origin}/.well-known/ai-catalog.json`,
      openapi: `${origin}/openapi.json`,
      search: `${origin}/api/v1/public/products/search`,
    },
    status: "discovery-only",
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json; charset=utf-8",
    }
  });
}
