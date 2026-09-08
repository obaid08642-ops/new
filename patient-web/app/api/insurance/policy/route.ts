import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

const schema = z.object({
  company_id: z.string().min(1).max(128),
  policy_number: z.string().min(3).max(64),
  member_id: z.string().max(64).optional().default(""),
  member_name: z.string().max(128).optional().default(""),
  expiry_date: z.string().max(32).optional().default(""),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "invalid_policy_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const key = request.headers.get("idempotency-key")?.trim();
  const upstream = await callPatientApi(
    "/insurance/save-policy",
    {
      method: "POST",
      headers: { ...(key ? { "idempotency-key": key } : {}) },
      body: JSON.stringify(parsed.data),
    },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "policy_save_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
