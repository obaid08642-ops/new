import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("enroll"), programType: z.enum(["diabetes", "hypertension", "pregnancy"]) }),
  z.object({ kind: z.literal("complete-session"), programType: z.string().trim().min(2).max(40), sessionId: z.string().trim().min(1).max(80) }),
]);

/** Treatment programs parity #29: enroll + complete-session over /medical/programs. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_program_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const path = parsed.data.kind === "enroll" ? "/medical/programs/enroll" : "/medical/programs/complete-session";
  const payload = parsed.data.kind === "enroll" ? { programType: parsed.data.programType } : { programType: parsed.data.programType, sessionId: parsed.data.sessionId };
  const upstream = await callPatientApi(path, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(payload),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "program_action_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true, state: data?.state ?? data?.status ?? null }, { status: 200, headers: { "cache-control": "no-store" } });
}
