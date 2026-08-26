import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ threadId: string }> };

const MAX_BYTES = 15 * 1024 * 1024; // matches the upstream FileInterceptor cap

/**
 * Chat attachment upload (parity #13 completion): multipart passthrough to
 * POST /media/upload with purpose=chat and thread_id bound upstream — the
 * asset registry then authorizes media_ids on send.
 */
export async function POST(request: Request, context: Context) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const { threadId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const incoming = await request.formData().catch(() => null);
  const file = incoming?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "file_required" }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ message: "file_size_invalid" }, { status: 400 });

  const forward = new FormData();
  forward.set("purpose", "chat");
  forward.set("thread_id", threadId);
  forward.set("file", file, file.name || "attachment");

  const userAgent = (await headers()).get("user-agent")?.slice(0, 200) || undefined;
  const upstream = await callPatientApi("/media/upload", {
    method: "POST",
    headers: { ...(userAgent ? { "user-agent": userAgent } : {}) },
    body: forward,
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data?.id) {
    return NextResponse.json({ message: data?.message || "upload_failed" }, { status: upstream.ok ? 502 : upstream.status });
  }
  return NextResponse.json(
    { id: String(data.id), purpose: data.purpose ?? "chat", thread_id: data.thread_id ?? threadId },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
