import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const bodySchema = z.object({
  mood: z.enum(["great", "good", "okay", "bad", "terrible"]),
  energy_level: z.coerce.number().int().min(1).max(5).optional(),
  stress_level: z.coerce.number().int().min(1).max(5).optional(),
  sleep_hours: z.coerce.number().min(0).max(24).optional(),
});

/** Mental-health parity #16/#19: logs a self-reported mood entry. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_mood_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi("/mental-health/mood", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(parsed.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "log_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true, id: data?.id ?? null }, { status: 200, headers: { "cache-control": "no-store" } });
}
