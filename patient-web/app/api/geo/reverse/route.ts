import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

// A point on the earth; the backend (GET /geo/reverse) answers 400 outside_service_area for a point outside the kingdom.
// Both are required text first (coercing a missing value would read it as 0), then a number in range.
const number = (min: number, max: number) => z.string().trim().min(1).max(32).transform(Number).pipe(z.number().finite().min(min).max(max));
const query = z.object({ lat: number(-90, 90), lng: number(-180, 180) });

/**
 * The map step of the address form: backend GET /geo/reverse (Saudi National Address, then OpenStreetMap, matched to OUR city
 * and district codes). Signed-in patients only; the answer is about one point and is never shared between people.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = query.safeParse({ lat: url.searchParams.get("lat"), lng: url.searchParams.get("lng") });
  if (!parsed.success) return NextResponse.json({ message: "invalid_point" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const { lat, lng } = parsed.data;
  const upstream = await callPatientApi(`/geo/reverse?lat=${lat}&lng=${lng}`, { signal: request.signal }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "geo_reverse_failed", upstream.status);
  return NextResponse.json(data, { headers: { "cache-control": "private, no-store" } });
}
