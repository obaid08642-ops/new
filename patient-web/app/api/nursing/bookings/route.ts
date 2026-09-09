import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  service_id: z.string().min(1).max(128),
  scheduled_at: z.string().min(1).max(64),
  address_id: z.string().max(128).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
  payment_method: z.enum(["cash", "card", "insurance"]).optional().default("cash"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });
  const scheduled = new Date(parsed.data.scheduled_at);
  if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now()) {
    return NextResponse.json({ message: "slot_expired" }, { status: 400 });
  }
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const key = request.headers.get("idempotency-key")?.trim();
  const upstream = await callPatientApi(
    "/home-care/bookings",
    {
      method: "POST",
      headers: { ...(key ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(parsed.data),
    },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "nursing_booking_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
