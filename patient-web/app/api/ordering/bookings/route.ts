import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const id = z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/);
const selection = z.object({
  provider_id: id,
  window: z.object({ asap: z.boolean().optional(), start: z.string().max(40).optional(), end: z.string().max(40).optional() }).optional(),
  slot_id: id.optional(),
  walk_in: z.boolean().optional(),
});
const schema = z.object({
  quote_id: id,
  selections: z.object({ home: selection.optional(), facility: selection.optional() }),
  payment_method: z.enum(["cash", "card", "insurance"]),
  gender_preference: z.enum(["female", "male"]).optional(),
  medical_order_id: id.optional(),
  notes: z.string().max(500).optional(),
});

/** POST /ordering/bookings: one group of bookings from a quote. The documents upload belongs to the confirm-and-pay step. */
export async function POST(request: Request) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_booking_payload" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/ordering/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "booking_failed", upstream.status);
  return NextResponse.json(data, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
