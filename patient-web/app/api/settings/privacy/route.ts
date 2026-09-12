import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const bodySchema = z.object({
  shareData: z.boolean().optional(),
  analytics: z.boolean().optional(),
  location: z.boolean().optional(),
  marketing: z.boolean().optional(),
  thirdParty: z.boolean().optional(),
}).strict().refine((v) => Object.keys(v).length > 0, { message: "empty_patch" });

export async function GET() {
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/users/me/privacy-settings", {}, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "privacy_load_failed", upstream.status);
  return NextResponse.json(data ?? {}, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_privacy_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/users/me/privacy-settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "privacy_save_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
