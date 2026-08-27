import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const bodySchema = z.object({
  address_id: z.string().trim().min(1).max(200),
  payment_method_id: z.string().trim().min(1).max(200).optional(),
  cash: z.literal(true).optional(),
  coupon_code: z.string().trim().max(120).optional(),
  prescription_media_ids: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
}).refine((value) => Boolean(value.payment_method_id || value.cash), { message: "payment_method_required" });
const paymentIntentSchema = z.object({ id: z.string().trim().min(1).max(200), status: z.string().trim().min(1).max(80) }).passthrough();
const resultSchema = z.object({ order_id: z.string().uuid(), status: z.string().trim().min(1).max(80), total: z.number().finite().nonnegative(), payment_intent: paymentIntentSchema.optional() });

export async function POST(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_checkout_payload" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/cart/checkout", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(input.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "checkout_failed", upstream.status);
  const parsed = resultSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ message: "unexpected_checkout_response" }, { status: 502 });
  return NextResponse.json(parsed.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
