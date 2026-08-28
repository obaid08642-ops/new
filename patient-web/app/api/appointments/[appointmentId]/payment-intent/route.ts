import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { createPatientPaymentIntent } from "@/lib/api/payments-server";
import { parsePaymentIntent } from "@/lib/api/payments";

type Context = { params: Promise<{ appointmentId: string }> };
const idSchema = z.string().uuid();

export async function POST(request: Request, context: Context) {
  const { appointmentId } = await context.params;
  if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = createPatientPaymentIntent(token, "consultation", appointmentId, key);
  if (!upstream) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const result = await upstream; const data = await result.json().catch(() => null);
  if (!result.ok) return NextResponse.json(data || { message: "payment_intent_failed" }, { status: result.status });
  const parsed = parsePaymentIntent(data);
  if (!parsed) return NextResponse.json({ message: "unexpected_payment_intent_response" }, { status: 502 });
  return NextResponse.json(parsed, { status: result.status, headers: { "cache-control": "no-store" } });
}

