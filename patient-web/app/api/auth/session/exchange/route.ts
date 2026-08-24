import { NextResponse } from "next/server";
import { z } from "zod";
import { callPatientApi } from "@/lib/api/upstream";

const exchangeSchema = z.object({ authenticated: z.literal(true) });

export async function POST(request: Request) {
  const incoming = request.headers.get("cookie") || "";
  const match = incoming.match(/(?:^|;\s*)nabd_otp_exchange=([^;]+)/);
  if (!match?.[1]) return NextResponse.json({ message: "otp_exchange_required" }, { status: 400 });
  const cookie = `nabd_otp_exchange=${match[1]}`;
  const upstream = await callPatientApi("/auth/session/exchange", { method: "POST", headers: { cookie, "x-device-id": request.headers.get("x-nabd-device-id") || crypto.randomUUID() } });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "session_exchange_failed" }, { status: upstream.status });
  const parsed = exchangeSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ message: "unexpected_session_response" }, { status: 502 });
  const response = NextResponse.json(parsed.data, { status: upstream.status });
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) response.headers.set("set-cookie", setCookie
    .replace(/Path=\/api\/v1\/auth\/session\/exchange/gi, "Path=/api/auth/session/exchange")
    .replace(/Path=\/api\/v1/gi, "Path=/"));
  return response;
}
