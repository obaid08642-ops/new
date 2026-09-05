import { NextResponse } from "next/server";

/**
 * x402 Facilitator & Challenge Route
 * Returns HTTP 402 with required payment parameters for automated agent callers.
 */
export function GET() {
  return new NextResponse(
    JSON.stringify({
      error: "Payment Required",
      message: "This endpoint requires an x402 authorized payment token or patient session.",
      x402: {
        version: "1.0",
        currency: "SAR",
        amount: "150.00",
        recipient: "Nabd Plus Digital Health Co.",
        methods: ["card", "takaful_insurance", "usdc"],
        terms_url: "https://nabd.plus/ar/terms"
      }
    }),
    {
      status: 402,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json; charset=utf-8",
        "WWW-Authenticate": 'x402 realm="nabd.plus", currency="SAR", amount="150.00"',
      }
    }
  );
}

export function POST() {
  return GET();
}
