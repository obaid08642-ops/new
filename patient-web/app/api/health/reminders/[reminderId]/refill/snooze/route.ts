import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ reminderId: string }> };

/** Defers the refill follow-up of a chronic medicine by three days (backend POST /health/reminders/:id/refill/snooze, as the app). */
export async function POST(_request: Request, context: Context) {
  const { reminderId } = await context.params;
  if (!reminderId || reminderId.length > 128) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    `/health/reminders/${encodeURIComponent(reminderId)}/refill/snooze`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ days: 3 }) },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "refill_snooze_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
