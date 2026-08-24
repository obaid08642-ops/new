import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const bodySchema = z.object({
  medicine_id: z.string().trim().min(1).max(200).optional(),
  manual_name: z.string().trim().min(2).max(160).optional(),
  quantity: z.number().int().min(1).max(100),
}).refine((value) => Boolean(value.medicine_id || value.manual_name) && !(value.medicine_id && value.manual_name), {
  message: "medicine_id_or_manual_name_required",
});

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  }
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_cart_item" }, { status: 400 });

  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const upstream = await callPatientApi("/cart/items", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
      ...(deviceId ? { "x-device-id": deviceId } : {}),
    },
    body: JSON.stringify(input.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "cart_item_failed", upstream.status);
  return NextResponse.json({ ok: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
