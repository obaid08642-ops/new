import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ eventId: string }> };

/** Deletes one event of the family calendar: DELETE /family/calendar/event/:id. */
export async function DELETE(_request: Request, context: Context) {
  const { eventId } = await context.params;
  if (!z.string().min(1).max(128).safeParse(eventId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/family/calendar/event/${encodeURIComponent(eventId)}`, { method: "DELETE" }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "calendar_event_delete_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
