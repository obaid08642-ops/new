import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const itemIdSchema = z.string().trim().min(1).max(200);
const patchSchema = z.object({ quantity: z.number().int().min(1).max(100) });
type Context = { params: Promise<{ itemId: string }> };

async function mutation(request: Request, context: Context, method: "PATCH" | "DELETE") {
  const { itemId: rawItemId } = await context.params;
  const itemId = itemIdSchema.safeParse(rawItemId);
  if (!itemId.success) return NextResponse.json({ message: "invalid_cart_item" }, { status: 400 });
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  }
  const body = method === "PATCH" ? patchSchema.safeParse(await request.json().catch(() => null)) : null;
  if (method === "PATCH" && !body?.success) return NextResponse.json({ message: "invalid_cart_item" }, { status: 400 });

  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const upstream = await callPatientApi(`/cart/items/${encodeURIComponent(itemId.data)}`, {
    method,
    headers: {
      "idempotency-key": idempotencyKey,
      ...(method === "PATCH" ? { "content-type": "application/json" } : {}),
      ...(deviceId ? { "x-device-id": deviceId } : {}),
    },
    ...(method === "PATCH" ? { body: JSON.stringify(body?.data) } : {}),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "cart_item_failed", upstream.status);
  return NextResponse.json({ ok: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request, context: Context) { return mutation(request, context, "PATCH"); }
export async function DELETE(request: Request, context: Context) { return mutation(request, context, "DELETE"); }
