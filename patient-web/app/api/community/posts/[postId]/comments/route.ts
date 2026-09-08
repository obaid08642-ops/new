import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ postId: string }> };
const idSchema = z.string().min(1).max(128);
const bodySchema = z.object({ body: z.string().trim().min(1).max(1000) });

export async function POST(request: Request, context: Context) {
  const { postId } = await context.params;
  if (!idSchema.safeParse(postId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_comment_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    `/community/posts/${encodeURIComponent(postId)}/comment`,
    { method: "POST", body: JSON.stringify({ body: parsed.data.body }) },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "comment_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
