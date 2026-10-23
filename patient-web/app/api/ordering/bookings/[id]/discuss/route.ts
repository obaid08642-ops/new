import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** POST /ordering/bookings/:id/results/discuss: attaches the booking's result to the consultation draft (404 `results_not_ready`). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const { id } = await context.params;
  if (!ID.test(id)) return NextResponse.json({ message: "results_not_ready" }, { status: 404 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/ordering/bookings/${encodeURIComponent(id)}/results/discuss`, { method: "POST" }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "discuss_failed", upstream.status);
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
