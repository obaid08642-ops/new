import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const bodySchema = z.object({ two_factor: z.boolean() }).strict();

/** PATCH /users/me/security-settings: the two-factor switch (biometric sign-in is a device setting and stays read-only). */
export async function PATCH(request: Request) {
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_security_payload" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/users/me/security-settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.data),
    cache: "no-store",
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "security_save_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
