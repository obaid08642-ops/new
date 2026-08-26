import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ threadId: string }> };
const idSchema = z.string().uuid();

/**
 * Chat realtime (parity #13 completion): short-lived chat_rt token for the
 * socket.io handshake — scoped to THIS thread, 10 minutes, verified upstream.
 */
export async function GET(request: Request, context: Context) {
  const { threadId } = await context.params;
  if (!idSchema.safeParse(threadId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  // Read-only token mint; CSRF is a mutation guard, but keep same-origin anyway.
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi(`/chat/threads/${encodeURIComponent(threadId)}/rt-token`, {}, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data?.token) return NextResponse.json(data || { message: "rt_token_unavailable" }, { status: upstream.status });
  return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
}
