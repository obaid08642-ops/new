import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ appointmentId: string }> };
const idSchema = z.string().uuid();
const bodySchema = z.object({ new_slot_id: z.string().trim().max(160).optional(), scheduled_at: z.string().datetime({ offset: true }).optional(), reason: z.string().trim().max(500).optional() }).refine((value) => Boolean(value.new_slot_id || value.scheduled_at), { message: "slot_required" });

export async function PATCH(request: Request, context: Context) {
  const { appointmentId } = await context.params;
  if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "invalid_reschedule_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/unified-bookings/consultation/${appointmentId}/reschedule`, { method: "PATCH", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify(parsed.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "reschedule_failed", upstream.status);
  return NextResponse.json({ ok: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
