import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const bodySchema = z.object({
  booking_id: z.string().trim().min(3).max(80),
  booking_kind: z.enum(["appointment", "lab", "radiology", "nursing", "pharmacy", "booking"]).optional(),
  reason: z.string().trim().min(3).max(1000),
});

/** Returns parity #26: files a refund request — amount/percent come from the stored record upstream. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_refund_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi("/refunds/request", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(parsed.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "refund_request_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true, id: data?.id ?? null, refund_percent: data?.refund_percent ?? null, refund_amount: data?.refund_amount ?? null, state: data?.state ?? null }, { status: 200, headers: { "cache-control": "no-store" } });
}
