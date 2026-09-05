import { NextResponse } from "next/server";

const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");

/**
 * x402 Protocol Discovery Endpoint (x402.org / Coinbase)
 */
export function GET() {
  return NextResponse.json({
    x402: {
      version: "1.0",
      facilitator: `${origin}/api/x402`,
      schemes_supported: ["exact", "upto"],
      currencies_supported: ["SAR", "USDC"],
      payment_methods: ["card", "wallet"],
      endpoints: {
        telehealth: `${origin}/api/v1/consultations/telehealth/session`,
        orders: `${origin}/api/v1/cart/checkout/agent`
      }
    }
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json; charset=utf-8",
    }
  });
}
