import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const bodySchema = z.object({
  type: z.enum(["bp", "glucose", "heart_rate", "weight", "temperature", "spo2"]),
  value: z.string().trim().max(20).optional(),
  systolic: z.coerce.number().int().min(60).max(260).optional(),
  diastolic: z.coerce.number().int().min(30).max(160).optional(),
  measured_at: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/)).optional(),
}).refine((data) => data.type === "bp" ? Boolean(data.systolic && data.diastolic) : Boolean(data.value), { message: "value_required" });

/** Health parity #16: logs a vital reading — physiological validation upstream. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_vital_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi("/health/vitals", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(parsed.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "log_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true, id: data?.id ?? null }, { status: 200, headers: { "cache-control": "no-store" } });
}
