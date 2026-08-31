import { NextResponse } from "next/server";

// Universal Commerce Protocol discovery — صادق: قائمة فقط، checkout معطّل.
export function GET() {
  return NextResponse.json({
    ucp_version: "0.1",
    merchant: "Nabd Plus",
    operations: { search: true, cart: false, checkout: false },
    openapi: "/.well-known/openapi.json",
    status: "discovery-only",
  }, { headers: { "cache-control": "public, max-age=3600" } });
}
