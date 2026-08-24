import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const bodySchema = z.object({
  service_id: z.string().trim().min(1).max(160),
  scheduled_at: z.string().datetime({ offset: true }),
}).refine((value) => new Date(value.scheduled_at).getTime() >= Date.now() - 5 * 60_000, { message: "scheduled_at_required" });
const resultSchema = z.object({ id: z.string().uuid(), status: z.string().trim().min(1).max(80) });

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_radiology_booking_payload" }, { status: 400 });
  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const upstream = await callPatientApi("/radiology/bookings", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey, ...(deviceId ? { "x-device-id": deviceId } : {}) },
    body: JSON.stringify({ ...input.data, delivery_mode: "IN_CENTER" }),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "radiology_booking_failed", upstream.status);
  const result = resultSchema.safeParse(data);
  if (!result.success) return NextResponse.json({ message: "unexpected_radiology_booking_response" }, { status: 502 });
  return NextResponse.json(result.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
