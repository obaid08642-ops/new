import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ reminderId: string }> };

export async function POST(_request: Request, context: Context) {
  const { reminderId } = await context.params;
  if (!reminderId || reminderId.length > 128) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    `/health/reminders/${encodeURIComponent(reminderId)}/refill`,
    { method: "POST", body: JSON.stringify({}) },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "refill_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
