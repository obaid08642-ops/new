import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ action: string }> };

const postSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(8000),
  tag: z.string().trim().max(40).optional(),
  category: z.string().trim().max(40).optional(),
  is_anonymous: z.boolean().optional(),
});
const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  is_anonymous: z.boolean().optional(),
});
const voteSchema = z.object({ vote: z.enum(["up", "down"]) });

/** Community parity #31: new post / comment / vote. */
export async function POST(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const { action } = await context.params;
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  if (action === "new") {
    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "invalid_post_payload" }, { status: 400 });
    const upstream = await callPatientApi("/community/posts", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(parsed.data),
    }, token);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json(data || { message: "post_failed" }, { status: upstream.status });
    return NextResponse.json({ ok: true, id: data?.id ?? null }, { status: upstream.status, headers: { "cache-control": "no-store" } });
  }

  const commentMatch = /^comment\/([0-9a-zA-Z_-]{6,80})$/.exec(action);
  if (commentMatch) {
    const parsed = commentSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "invalid_comment_payload" }, { status: 400 });
    const upstream = await callPatientApi(`/community/posts/${encodeURIComponent(commentMatch[1])}/comment`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(parsed.data),
    }, token);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json(data || { message: "comment_failed" }, { status: upstream.status });
    return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  }

  const voteMatch = /^vote\/([0-9a-zA-Z_-]{6,80})$/.exec(action);
  if (voteMatch) {
    const parsed = voteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: "invalid_vote_payload" }, { status: 400 });
    const upstream = await callPatientApi(`/community/posts/${encodeURIComponent(voteMatch[1])}/vote`, {
      method: "PUT",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify(parsed.data),
    }, token);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return NextResponse.json(data || { message: "vote_failed" }, { status: upstream.status });
    return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
  }

  return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
}
