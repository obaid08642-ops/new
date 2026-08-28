import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const bodySchema = z.object({
  doctor_id: z.string().uuid(),
  service_type: z.enum(["clinic", "video", "home"]),
  slot_start: z.string().datetime({ offset: true }),
  payment_method: z.enum(["cash", "card", "insurance"]),
  patient_notes: z.string().trim().max(2000).optional(),
}).strict();
const resultSchema = z.object({ id: z.string().uuid(), status: z.string().min(1), insurance_request_id: z.string().uuid().optional() });

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_appointment_payload" }, { status: 400 });
  const store = await cookies(); const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const upstream = await callPatientApi("/care/appointments", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey, ...(deviceId ? { "x-device-id": deviceId } : {}) }, body: JSON.stringify(input.data) }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "appointment_booking_failed", upstream.status);
  const result = resultSchema.safeParse(data);
  if (!result.success) return NextResponse.json({ message: "unexpected_appointment_response" }, { status: 502 });
  return NextResponse.json(result.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
