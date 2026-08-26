import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const bodySchema = z.object({
  metric: z.enum(["steps", "heart_rate", "sleep_hours", "calories", "weight_kg", "distance_km"]),
  value: z.coerce.number().min(0).max(1_000_000),
  unit: z.string().trim().max(20).optional(),
  recorded_at: z.string().max(40).optional(),
});

/** Wearables parity #32: manual sample ingest (source=manual set server-side). */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_sample_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi("/wearables/data", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify({ ...parsed.data, source: "manual" }),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "ingest_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true, inserted: data?.inserted ?? null }, { status: 200, headers: { "cache-control": "no-store" } });
}
