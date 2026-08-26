import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ threadId: string }> };
const idSchema = z.string().uuid();
const bodySchema = z.object({
  body: z.string().trim().max(4000).optional(),
  client_message_id: z.string().uuid(),
  media_ids: z.array(z.string().trim().regex(/^[A-Za-z0-9_-]{6,80}$/)).max(10).optional(),
}).refine((data) => (data.body && data.body.length > 0) || (data.media_ids && data.media_ids.length > 0), { message: "empty_message" });

/** Chat send (parity #13): text and/or pre-uploaded attachment ids — upstream
 * dedupes on client_message_id and validates media ownership/thread binding. */
export async function POST(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const { threadId } = await context.params;
  if (!idSchema.safeParse(threadId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_message_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const hasMedia = Boolean(parsed.data.media_ids?.length);
  const upstream = await callPatientApi(`/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify({
      type: hasMedia ? "file" : "text",
      ...(parsed.data.body ? { body: parsed.data.body } : {}),
      ...(hasMedia ? { media_ids: parsed.data.media_ids } : {}),
      client_message_id: parsed.data.client_message_id,
    }),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "send_failed" }, { status: upstream.status });
  return NextResponse.json({ id: data?.id ?? null, created_at: typeof data?.createdAt === "string" ? data.createdAt : null }, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
