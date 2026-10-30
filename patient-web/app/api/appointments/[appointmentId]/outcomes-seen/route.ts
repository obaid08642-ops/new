import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ appointmentId: string }> };
const idSchema = z.string().uuid();

/** The patient opened the visit's outcomes: PATCH /care/appointments/:id/outcomes/seen (clears the visit's badge). */
export async function POST(_request: Request, context: Context) {
  const { appointmentId } = await context.params;
  if (!idSchema.safeParse(appointmentId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401, headers: { "cache-control": "no-store" } });
  const upstream = await callPatientApi(`/care/appointments/${appointmentId}/outcomes/seen`, { method: "PATCH" }, token);
  if (!upstream.ok) return boundedUpstreamError(await upstream.json().catch(() => null), "outcomes_seen_failed", upstream.status);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
