import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("join-challenge"), challenge_id: z.string().trim().min(1).max(80) }),
  z.object({ kind: z.literal("claim-reward"), reward_id: z.string().trim().min(1).max(80) }),
  z.object({ kind: z.literal("apply-referral"), code: z.string().trim().min(3).max(60) }),
]);

/** Loyalty parity #22: join challenges, claim rewards, apply referral codes. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_loyalty_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const path = parsed.data.kind === "join-challenge"
    ? `/loyalty/challenges/${encodeURIComponent(parsed.data.challenge_id)}/join`
    : parsed.data.kind === "claim-reward"
      ? `/loyalty/rewards/${encodeURIComponent(parsed.data.reward_id)}/claim`
      : "/referrals/apply";
  const payload = parsed.data.kind === "apply-referral" ? { code: parsed.data.code } : {};
  const upstream = await callPatientApi(path, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(payload),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "loyalty_action_failed" }, { status: upstream.status });
  return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
}
