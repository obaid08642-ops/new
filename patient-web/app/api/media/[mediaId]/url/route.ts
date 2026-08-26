import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ mediaId: string }> };
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{6,80}$/);

/** Attachment delivery (parity #13): participant-scoped signed URL upstream. */
export async function GET(request: Request, context: Context) {
  const { mediaId } = await context.params;
  if (!idSchema.safeParse(mediaId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi(`/media/${encodeURIComponent(mediaId)}/url`, {}, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data?.url) return NextResponse.json(data || { message: "media_url_failed" }, { status: upstream.status });
  return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
}
