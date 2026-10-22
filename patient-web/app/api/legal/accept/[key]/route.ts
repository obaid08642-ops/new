import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

/**
 * D-38: the signed-in patient accepts a policy the site asks for (`POST /legal/accept/:key`). Only the telehealth consent
 * is accepted from the site after sign-up (the sign-up records the terms and privacy itself). The backend records the
 * version, the time, the device (this browser's device cookie) and the platform with the acceptance.
 */
const ACCEPTABLE = ["telehealth_consent"] as const;
const keySchema = z.enum(ACCEPTABLE);
const resultSchema = z.object({ ok: z.literal(true), version: z.union([z.string(), z.number()]).optional() }).passthrough();

export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = keySchema.safeParse((await params).key);
  if (!key.success) return NextResponse.json({ message: "policy_not_acceptable" }, { status: 404 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const deviceId = store.get(authCookieNames.device)?.value;
  const userAgent = request.headers.get("user-agent");
  const upstream = await callPatientApi(`/legal/accept/${key.data}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": `legal-${key.data}-${randomUUID()}`,
      "x-app-platform": "web",
      ...(deviceId ? { "x-device-id": deviceId } : {}),
      ...(userAgent ? { "user-agent": userAgent.slice(0, 300) } : {}),
    },
    body: "{}",
  }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "policy_accept_failed", upstream.status);
  const result = resultSchema.safeParse(data);
  if (!result.success) return NextResponse.json({ message: "unexpected_accept_response" }, { status: 502 });
  return NextResponse.json({ ok: true, version: result.data.version ?? null }, { status: 200, headers: { "cache-control": "no-store" } });
}
