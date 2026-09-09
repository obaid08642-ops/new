import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  items: z.array(z.object({ service_id: z.string().min(1).max(128) })).min(1).max(20),
  provider_account_id: z.string().min(1).max(128),
  scheduled_at: z.string().min(1).max(64),
  location_type: z.enum(["home", "facility"]),
  payment_method: z.enum(["cash", "card", "insurance"]),
  address: z.string().max(1000).optional().default(""),
  contact: z.object({ name: z.string().max(128).optional(), phone: z.string().max(32).optional() }).optional(),
  insurance_provider: z.string().max(128).optional(),
  insurance_member_id: z.string().max(64).optional(),
  notes: z.string().max(2000).optional().default(""),
  documents: z.array(z.object({ kind: z.string().min(1).max(64), url: z.string().max(2048).optional() })).max(10).optional().default([]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });
  const scheduled = new Date(parsed.data.scheduled_at);
  if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() < Date.now() - 5 * 60_000) {
    return NextResponse.json({ message: "slot_expired" }, { status: 400 });
  }
  if (parsed.data.location_type === "home" && parsed.data.payment_method === "cash") {
    return NextResponse.json({ message: "payment_method_not_allowed_for_home" }, { status: 400 });
  }
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const key = request.headers.get("idempotency-key")?.trim();
  const upstream = await callPatientApi(
    "/labs/bookings",
    {
      method: "POST",
      headers: { ...(key ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(parsed.data),
    },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "diagnostics_booking_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
