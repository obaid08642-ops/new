import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ reminderId: string }> };
const schema = z.object({
  status: z.enum(["taken", "skipped", "snoozed"]),
  time_key: z.string().max(16).optional().default(""),
});

/** F69: log a dose (same endpoint as the app). */
export async function POST(req: Request, context: Context) {
  const { reminderId } = await context.params;
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_log_payload" }, { status: 400 });
  const upstream = await callPatientApi(`/health/reminders/${encodeURIComponent(reminderId)}/log`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(parsed.data),
  }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "reminder_log_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
