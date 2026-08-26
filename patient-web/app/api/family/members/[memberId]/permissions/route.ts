import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ memberId: string }> };
const idSchema = z.string().regex(/^[0-9a-f-]{8,64}$/i);
const bodySchema = z.object({ scopes: z.array(z.string().trim().min(2).max(40)).max(20) });

/** Family parity #15: owner sets a member's permission scopes (e.g. booking). */
export async function PATCH(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const { memberId } = await context.params;
  if (!idSchema.safeParse(memberId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi(`/family/members/${encodeURIComponent(memberId)}/permissions`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scopes: parsed.data.scopes }),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "permissions_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
