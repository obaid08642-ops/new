import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/** GET /consultations/instant/:id: the status, seconds left and (after the timeout) the fallback of the patient's own request. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!ID.test(id)) return NextResponse.json({ message: "instant_request_not_found" }, { status: 404 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/consultations/instant/${encodeURIComponent(id)}`, { cache: "no-store" }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "instant_failed", upstream.status);
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
