import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const schema = z.object({ choice: z.enum(["pay_difference", "covered_only", "cancel_free"]) });

/** POST /ordering/bookings/:id/partial-choice: the patient's answer to a partial or rejected insurer decision (taken once; 409 `choice_not_pending` after). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const { id } = await context.params;
  if (!ID.test(id)) return NextResponse.json({ message: "booking_not_found" }, { status: 404 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_choice_payload" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/ordering/bookings/${encodeURIComponent(id)}/partial-choice`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "partial_choice_failed", upstream.status);
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
