import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  event_date: z.string().datetime(),
  member_user_id: z.string().min(1).max(128),
  type: z.enum(["appointment", "order", "lab", "reminder", "medication"]),
});

/** Adds an event to the family calendar: POST /family/calendar/event (the same body as the app). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_calendar_event" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/family/calendar/event", { method: "POST", body: JSON.stringify(parsed.data) }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "calendar_event_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
