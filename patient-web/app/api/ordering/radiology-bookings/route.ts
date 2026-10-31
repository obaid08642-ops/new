import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const id = z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/);
const schema = z.object({
  service_id: id,
  provider_id: id,
  scheduled_at: z.string().max(40),
  location_type: z.enum(["home", "facility"]),
  payment_method: z.enum(["card", "insurance"]),
  documents: z.array(z.object({ kind: z.literal("doctor_request"), url_or_b64: z.string().max(2_000_000), filename: z.string().max(200).optional() })).max(5).optional(),
});

/**
 * POST /radiology/bookings for one scan of a radiology basket (the ordering route books labs only). The provider is named as the quote
 * showed it (profile id); the server resolves its account and prices the scan itself. Only the booking's id, status and total go back.
 */
export async function POST(request: Request) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/radiology/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "booking_failed", upstream.status);
  const raw = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const src = raw.data && typeof raw.data === "object" ? (raw.data as Record<string, unknown>) : raw;
  return NextResponse.json(
    { id: typeof src.id === "string" ? src.id : null, status: typeof src.state === "string" ? src.state : typeof src.status === "string" ? src.status : null, total: typeof src.total_price === "number" ? src.total_price : typeof src.total === "number" ? src.total : null },
    { status: upstream.status, headers: { "cache-control": "no-store" } },
  );
}
