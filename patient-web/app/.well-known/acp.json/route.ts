import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

/**
 * Agentic Commerce Protocol (ACP) Discovery Document (agenticcommerce.dev)
 */
export function GET() {
  return NextResponse.json({
    protocol: {
      name: "acp",
      version: "2026-01",
    },
    schema: "https://agenticcommerce.dev/discovery/v0",
    name: "Nabd Plus Commerce",
    api_base_url: `${origin}/api/v1`,
    transports: ["https", "rest", "json-rpc"],
    capabilities: {
      services: [
        "product_search",
        "product_detail",
        "categories_browse",
        "price_check"
      ],
      product_search: "/api/v1/public/products/search",
      product_detail: "/api/v1/public/product/{locale}/{slug}",
      categories: "/api/v1/public/categories/{locale}",
      checkout: "manual_approval_required",
    },
    payment_protocols: ["x402", "mpp"],
    status: "active",
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json; charset=utf-8",
    }
  });
}
