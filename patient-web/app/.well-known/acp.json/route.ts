import { NextResponse } from "next/server";

// ACP discovery (agentic commerce) — وصف صادق للقدرات الحالية فقط.
export function GET() {
  return NextResponse.json({
    schema: "https://agenticcommerce.dev/discovery/v0",
    name: "Nabd Plus Commerce",
    capabilities: {
      product_search: "/api/v1/public/products/search",
      product_detail: "/api/v1/public/product/{locale}/{slug}",
      categories: "/api/v1/public/categories/{locale}",
      checkout: "disabled",        // لا checkout وكيلي بدون تأكيد/تفويض/idempotency/audit
    },
    payment_protocols: [],
    status: "discovery-only",
  }, { headers: { "cache-control": "public, max-age=3600" } });
}
