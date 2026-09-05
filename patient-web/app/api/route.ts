import { NextResponse } from "next/server";

export function GET(request: Request) {
  const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
  const walletAddress = "0x8B91bC178B8159fBFe554Bf66A12DE588f6B0E0D";
  const facilitator = "https://api.cdp.coinbase.com/platform/v2/x402";

  return NextResponse.json(
    {
      x402Version: 1,
      error: "Payment Required",
      message: "x402 agent-native HTTP payment required for autonomous API access.",
      paymentRequirements: {
        scheme: "exact",
        network: "base",
        token: "USDC",
        amount: "0.01",
        recipient: walletAddress,
        facilitator: facilitator,
        pay_url: `${origin}/api/x402`
      }
    },
    {
      status: 402,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Expose-Headers": "WWW-Authenticate, X-402-Version",
        "WWW-Authenticate": `x402 token="USDC", network="base", amount="0.01", recipient="${walletAddress}", facilitator="${facilitator}"`,
        "X-402-Version": "1",
        "Cache-Control": "no-store",
        "Content-Type": "application/json"
      }
    }
  );
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, X-Payment, WWW-Authenticate, Content-Type"
    }
  });
}
