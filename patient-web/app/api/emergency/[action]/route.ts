import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ action: string }> };

const triggerSchema = z.object({
  symptoms: z.string().trim().max(500).optional(),
  severity: z.enum(["critical", "high", "medium"]).optional(),
  location: z.object({ lat: z.number(), lng: z.number(), address: z.string().max(300).optional() }).optional(),
});
const cancelSchema = z.object({ reason: z.string().trim().max(300).optional() });

/** Emergency SOS (parity #30): trigger / cancel — tracking is read-only. */
export async function POST(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const { action } = await context.params;
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  if (action === "trigger") {
    const parsed = triggerSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "invalid_emergency_payload" }, { status: 400 });
    const upstream = await callPatientApi("/emergency/trigger", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(parsed.data),
    }, token);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json(data || { message: "trigger_failed" }, { status: upstream.status });
    return NextResponse.json({ ok: true, id: data?.id ?? data?.emergency_id ?? null }, { status: upstream.status, headers: { "cache-control": "no-store" } });
  }

  const cancelMatch = /^cancel\/([0-9a-zA-Z_-]{6,80})$/.exec(action);
  if (cancelMatch) {
    const parsed = cancelSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ message: "invalid_cancel_payload" }, { status: 400 });
    const upstream = await callPatientApi(`/emergency/${encodeURIComponent(cancelMatch[1])}/cancel`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(parsed.data),
    }, token);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json(data || { message: "cancel_failed" }, { status: upstream.status });
    return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
}
