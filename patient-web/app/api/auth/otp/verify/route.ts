import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";

const schema = z.object({ identifier: z.string().trim().min(3).max(320), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_otp_verify" }, { status: 400 });
  const upstream = await callPatientApi("/auth/otp/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "otp_verify_failed" }, { status: upstream.status });
  const expires = z.object({ ok: z.literal(true), expires_in: z.number().int().positive().max(60) }).safeParse(data);
  if (!expires.success) return NextResponse.json({ message: "unexpected_otp_response" }, { status: 502 });
  const response = NextResponse.json(expires.data, { status: upstream.status });
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie.replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange"));
  return response;
}
