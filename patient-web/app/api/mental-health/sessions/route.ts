import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const breathingSchema = z.object({
  kind: z.literal("breathing"),
  technique: z.enum(["box_breathing", "4_7_8", "diaphragmatic", "equal_breathing"]),
  rounds: z.coerce.number().int().min(1).max(100),
  duration_seconds: z.coerce.number().int().min(1).max(7200),
});
const meditationSchema = z.object({
  kind: z.literal("meditation"),
  type: z.enum(["guided", "breathing", "body_scan", "sleep", "mindfulness"]),
  duration_minutes: z.coerce.number().int().min(1).max(180),
  completed: z.boolean().optional(),
});
const bodySchema = z.discriminatedUnion("kind", [breathingSchema, meditationSchema]);

/** Wellbeing parity #19: logs a completed breathing or mindfulness session. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_session_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const { kind, ...payload } = parsed.data;
  const upstream = await callPatientApi(kind === "breathing" ? "/mental-health/breathing" : "/mental-health/meditation", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(payload),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "log_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
