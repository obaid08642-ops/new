import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const bodySchema = z.object({ reset_token: z.string().trim().min(1).max(1000), new_password: z.string().min(8).max(200) }).strict();
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_password_reset_payload" }, { status: 400, headers: { "cache-control": "no-store" } });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  const upstream = await callPatientApi("/auth/password/reset", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(parsed.data), cache: "no-store" }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "password_reset_failed", upstream.status);
  return NextResponse.json({ reset: true }, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
