import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  symptoms: z.string().trim().min(3).max(2000),
  red_flags: z.array(z.string()).optional().default([]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "invalid_triage_payload" }, { status: 400 });
  const jar = await cookies();
  const accessToken =
    jar.get(authCookieNames.access)?.value ??
    Object.values(authCookieNames)
      .map((n) => jar.get(n)?.value)
      .find((v) => v) ??
    null;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    "/ai/triage",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symptoms: parsed.data.symptoms, red_flags: parsed.data.red_flags }),
    },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "triage_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
