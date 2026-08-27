import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

type Context = { params: Promise<{ orderId: string }> };
const idSchema = z.string().uuid();
const bodySchema = z.object({ reason: z.string().trim().max(500).optional() });

export async function POST(request: Request, context: Context) {
  const { orderId } = await context.params;
  if (!idSchema.safeParse(orderId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const input = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!input.success) return NextResponse.json({ message: "invalid_order_cancel_payload" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(input.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "order_cancel_failed", upstream.status);
  return NextResponse.json({ ok: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
