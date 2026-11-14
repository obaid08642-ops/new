import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const schema = z.object({
  provider_id: z.string().regex(/^[A-Za-z0-9_.:-]{1,128}$/),
  mode: z.enum(["home", "facility"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** GET /ordering/windows: the offered 2-hour windows (home) or slots / walk-in (facility) of one provider. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const input = schema.safeParse(params);
  if (!input.success) return NextResponse.json({ message: "invalid_windows_query" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const qs = new URLSearchParams(input.data as Record<string, string>);
  const upstream = await callPatientApi(`/ordering/windows?${qs}`, { method: "GET", cache: "no-store" }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "windows_failed", upstream.status);
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
