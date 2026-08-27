import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

type Context = { params: Promise<{ itemId: string }> };
const idSchema = z.string().trim().min(1).max(200);
const patchSchema = z.object({ quantity: z.number().int().min(1).max(100) });

async function credentials(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return { error: NextResponse.json({ message: "idempotency_key_required" }, { status: 400 }) };
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return { error: NextResponse.json({ message: "authentication_required" }, { status: 401 }) };
  return { key, token };
}

async function mutate(request: Request, context: Context, method: "PATCH" | "DELETE") {
  const { itemId } = await context.params;
  if (!idSchema.safeParse(itemId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const auth = await credentials(request);
  if (auth.error) return auth.error;
  const body = method === "PATCH" ? patchSchema.safeParse(await request.json().catch(() => null)) : { success: true, data: {} as Record<string, never> };
  if (!body.success) return NextResponse.json({ message: "invalid_cart_item" }, { status: 400 });
  const upstream = await callPatientApi(`/cart/items/${encodeURIComponent(itemId)}`, { method, headers: { "content-type": "application/json", "idempotency-key": auth.key }, body: JSON.stringify(body.data) }, auth.token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, method === "PATCH" ? "cart_item_update_failed" : "cart_item_delete_failed", upstream.status);
  return NextResponse.json({ ok: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request, context: Context) { return mutate(request, context, "PATCH"); }
export async function DELETE(request: Request, context: Context) { return mutate(request, context, "DELETE"); }
