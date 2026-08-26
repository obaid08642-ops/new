import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ requestId: string }> };
const idSchema = z.string().uuid();
const bodySchema = z.object({}).loose();

/** Zero-copay settlement (APPROVED_FULL): registers the full approval — no payment. */
export async function POST(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const { requestId } = await context.params;
  if (!idSchema.safeParse(requestId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi(`/insurance/requests/${encodeURIComponent(requestId)}/pay-copay`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify({}),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "copay_settlement_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true, state: data?.state ?? null }, { status: 200, headers: { "cache-control": "no-store" } });
}
