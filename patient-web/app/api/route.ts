import { NextResponse } from "next/server";

export function GET(request: Request) {
  const origin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://nabd.plus").replace(/\/$/, "");
  const walletAddress = "0x8B91bC178B8159fBFe554Bf66A12DE588f6B0E0D";
  const facilitator = "https://api.cdp.coinbase.com/platform/v2/x402";

  const paymentData = {
    x402Version: 1,
    resource: `${origin}/api`,
    accepts: [
      {
        scheme: "exact",
        network: "base",
        asset: "USDC",
        amount: "0.01",
        recipient: walletAddress,
        facilitator: facilitator
      }
    ],
    facilitator: facilitator
  };

  const base64Payment = Buffer.from(JSON.stringify(paymentData)).toString("base64");

  return NextResponse.json(
    paymentData,
    {
      status: 402,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, payment-required, X-Payment-Required, WWW-Authenticate, X-402-Version",
        "PAYMENT-REQUIRED": base64Payment,
        "payment-required": base64Payment,
        "X-Payment-Required": base64Payment,
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
      "Access-Control-Allow-Headers": "Authorization, X-Payment, PAYMENT-SIGNATURE, WWW-Authenticate, Content-Type"
    }
  });
}
