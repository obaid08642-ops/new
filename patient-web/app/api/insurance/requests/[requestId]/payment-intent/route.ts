import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { createPatientPaymentIntent } from "@/lib/api/payments-server";
import { parsePaymentIntent } from "@/lib/api/payments";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ requestId: string }> }; const idSchema = z.string().uuid(); const bodySchema = z.object({ method: z.enum(["card", "apple-pay", "google-pay"]) }).strict();
export async function POST(request: Request, context: Context) {
  const { requestId } = await context.params;
  if (!idSchema.safeParse(requestId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_payment_method" }, { status: 400 });
  const store = await cookies(); const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = createPatientPaymentIntent(accessToken, "insurance", requestId, key, input.data.method);
  if (!upstream) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const result = await upstream; const data = await result.json().catch(() => null);
  if (!result.ok) return boundedUpstreamError(data, "payment_intent_failed", result.status);
  const parsed = parsePaymentIntent(data);
  if (!parsed) return NextResponse.json({ message: "unexpected_payment_intent_response" }, { status: 502 });
  return NextResponse.json(parsed, { status: result.status, headers: { "cache-control": "no-store" } });
}
