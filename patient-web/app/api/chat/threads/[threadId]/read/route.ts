import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ threadId: string }> };
const idSchema = z.string().uuid();
const bodySchema = z.object({ up_to_message_id: z.string().uuid().optional() });

/** Read receipts (parity #13): marks the thread read for the signed-in patient. */
export async function POST(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const { threadId } = await context.params;
  if (!idSchema.safeParse(threadId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ message: "invalid_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi(`/chat/threads/${encodeURIComponent(threadId)}/read`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(parsed.data),
  }, token);
  if (!upstream.ok) {
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data || { message: "mark_read_failed" }, { status: upstream.status });
  }
  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
