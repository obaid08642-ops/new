import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";

const schema = z.object({
  identifier: z.string().trim().min(3).max(320),
  code: z.string().regex(/^\d{6}$/),
});

const verifiedResponse = z.object({
  ok: z.literal(true).optional(),
  expires_in: z.number().int().positive().max(60).default(60),
  exchange_token: z.string().trim().min(1).max(4096).optional(),
  exchangeToken: z.string().trim().min(1).max(4096).optional(),
});

function rewriteExchangeCookie(setCookie: string) {
  return setCookie
    .replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange")
    .replace(/Path=\/api\/v1/gi, "Path=/api/auth/session/exchange");
}

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_otp_verify" }, { status: 400 });

  const upstream = await callPatientApi("/auth/otp/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.data),
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ message: "otp_verify_failed" }, { status: upstream.status });

  const parsed = verifiedResponse.safeParse(data);
  if (!parsed.success) return NextResponse.json({ message: "unexpected_otp_response" }, { status: 502 });

  const upstreamCookie = upstream.headers.get("set-cookie");
  const exchangeToken = parsed.data.exchange_token ?? parsed.data.exchangeToken;
  if (!upstreamCookie && !exchangeToken) return NextResponse.json({ message: "unexpected_otp_response" }, { status: 502 });

  const response = NextResponse.json({ ok: true, expires_in: parsed.data.expires_in }, { status: upstream.status });
  if (upstreamCookie) response.headers.set("set-cookie", rewriteExchangeCookie(upstreamCookie));

  if (exchangeToken && !upstreamCookie) {
    response.cookies.set("nabd_otp_exchange", exchangeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/session/exchange",
      maxAge: parsed.data.expires_in,
    });
  }
  return response;
}
