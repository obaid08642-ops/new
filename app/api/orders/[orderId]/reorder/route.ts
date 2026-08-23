import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

type Context = { params: Promise<{ orderId: string }> };
const idSchema = z.string().uuid();

export async function POST(request: Request, context: Context) {
  const { orderId } = await context.params;
  if (!idSchema.safeParse(orderId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/orders/${encodeURIComponent(orderId)}/reorder`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: "{}" }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "reorder_failed", upstream.status);
  return NextResponse.json({ ok: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
