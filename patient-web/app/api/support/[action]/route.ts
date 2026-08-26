import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ action: string }> };

const createSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(5).max(4000),
  category: z.enum(["GENERAL", "BILLING", "TECHNICAL", "PHARMACY", "BOOKING"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});
const replySchema = z.object({ message: z.string().trim().min(1).max(4000) });

/** Support parity #25: new ticket (POST /support/requests/new) or thread reply. */
export async function POST(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const { action } = await context.params;
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  if (action === "new") {
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "invalid_ticket_payload" }, { status: 400 });
    const upstream = await callPatientApi("/support/tickets", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(parsed.data),
    }, token);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json(data || { message: "create_failed" }, { status: upstream.status });
    return NextResponse.json({ ok: true, id: data?.id ?? null }, { status: 200, headers: { "cache-control": "no-store" } });
  }

  const replyMatch = /^reply\/([0-9a-zA-Z_-]{6,80})$/.exec(action);
  if (replyMatch) {
    const parsed = replySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "invalid_reply_payload" }, { status: 400 });
    const upstream = await callPatientApi(`/support/requests/${encodeURIComponent(replyMatch[1])}/reply`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({ message: parsed.data.message }),
    }, token);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json(data || { message: "reply_failed" }, { status: upstream.status });
    return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
}
