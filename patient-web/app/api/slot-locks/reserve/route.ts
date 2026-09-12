import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

// 10-minute slot hold consumed by appointment creation (P3-e). Naturally
// idempotent per user+slot (returns the existing hold), so no key needed.
const bodySchema = z.object({
  provider_id: z.string().uuid(),
  slot_start: z.string().datetime({ offset: true }),
  booking_kind: z.enum(["consultation"]).optional(),
}).strict();
const resultSchema = z.object({ id: z.string().uuid() }).passthrough();

export async function POST(request: Request) {
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_lock_payload" }, { status: 400 });
  const store = await cookies(); const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const upstream = await callPatientApi("/slot-locks/reserve", { method: "POST", headers: { "content-type": "application/json", ...(deviceId ? { "x-device-id": deviceId } : {}) }, body: JSON.stringify({ booking_kind: "consultation", ...input.data }) }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "slot_hold_failed", upstream.status);
  const result = resultSchema.safeParse(data);
  if (!result.success) return NextResponse.json({ message: "unexpected_lock_response" }, { status: 502 });
  return NextResponse.json({ id: result.data.id }, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
