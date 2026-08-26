import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ memberId: string }> };
const idSchema = z.string().regex(/^[0-9a-f-]{8,64}$/i);

/** Family parity #15: owner removes a member from the group. */
export async function DELETE(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const { memberId } = await context.params;
  if (!idSchema.safeParse(memberId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi(`/family/members/${encodeURIComponent(memberId)}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "remove_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
