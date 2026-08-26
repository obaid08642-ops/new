import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";
const bodySchema = z.object({
  doctor_id: z.string().uuid(),
  type: z.enum(["clinic", "video", "home"]),
  slot_id: z.string().trim().min(10).max(80),
  notes: z.string().trim().max(2000).optional(),
  payment_method_id: z.string().trim().min(1).max(200).optional(),
  // PH-SERVICE (D): insurance books WITHOUT payment — provider decision +
  // co-pay settlement confirm upstream (mirrors onto the appointment).
  coverage: z.enum(["CASH", "INSURANCE"]).optional(),
});
const resultSchema = z.object({ booking_id: z.string().uuid(), status: z.enum(["pending_payment", "confirmed"]) });

export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });
  const store = await cookies(); const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const insurance = input.data.coverage === "INSURANCE";
  const upstream = await callPatientApi("/unified-bookings", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey, ...(deviceId ? { "x-device-id": deviceId } : {}) },
    body: JSON.stringify(
      insurance
        ? {
            doctor_id: input.data.doctor_id,
            type: input.data.type,
            slot_id: input.data.slot_id,
            ...(input.data.notes ? { notes: input.data.notes } : {}),
            payment_method: "insurance",
          }
        : {
            doctor_id: input.data.doctor_id,
            type: input.data.type,
            slot_id: input.data.slot_id,
            ...(input.data.notes ? { notes: input.data.notes } : {}),
            ...(input.data.payment_method_id ? { payment_method_id: input.data.payment_method_id } : {}),
          },
    ),
  }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "booking_failed" }, { status: upstream.status });
  const bookingIdSchema = z.object({ booking_id: z.string().uuid(), status: z.string().min(1).max(40) });
  if (insurance) {
    // Insurance bookings park at the appointment's pending state — accept any
    // non-empty status here; confirmation arrives via the coverage mirror.
    const parsedInsuranceBooking = bookingIdSchema.safeParse(data);
    if (!parsedInsuranceBooking.success) return NextResponse.json({ message: "unexpected_booking_response" }, { status: 502 });
    const insReq = await callPatientApi("/insurance/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ booking_id: parsedInsuranceBooking.data.booking_id, booking_kind: "consultation" }),
    }, accessToken);
    const insData: any = await insReq.json().catch(() => null);
    return NextResponse.json(
      {
        booking_id: parsedInsuranceBooking.data.booking_id,
        status: "REQUEST_SUBMITTED",
        insurance_request_id: insReq.ok && insData?.id ? String(insData.id) : null,
        insurance_error: insReq.ok ? null : (insData?.message || "insurance_request_failed"),
      },
      { status: upstream.status, headers: { "cache-control": "no-store" } },
    );
  }
  const parsedBooking = resultSchema.safeParse(data);
  if (!parsedBooking.success) return NextResponse.json({ message: "unexpected_booking_response" }, { status: 502 });
  return NextResponse.json(parsedBooking.data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
