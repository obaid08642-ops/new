import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const addressSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  street: z.string().trim().min(1).max(250),
  city: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  building: z.string().trim().max(50).optional(),
  floor: z.string().trim().max(30).optional(),
  notes: z.string().trim().max(500).optional(),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  is_default: z.boolean().optional(),
});

async function sessionToken() {
  const store = await cookies();
  return { token: store.get(authCookieNames.access)?.value, deviceId: store.get(authCookieNames.device)?.value };
}

export async function GET() {
  const { token, deviceId } = await sessionToken();
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/users/me/addresses", { headers: deviceId ? { "x-device-id": deviceId } : {} }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "addresses_failed", upstream.status);
  return NextResponse.json(Array.isArray(data) ? data : [], { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const input = addressSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_address_payload" }, { status: 400 });
  const { token, deviceId } = await sessionToken();
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/users/me/addresses", {
    method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey, ...(deviceId ? { "x-device-id": deviceId } : {}) }, body: JSON.stringify(input.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "address_save_failed", upstream.status);
  return NextResponse.json(data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
