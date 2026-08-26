import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const bodySchema = z.object({ endpoint: z.string().url().max(2000) });

export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_subscription" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi("/push/web/unsubscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(parsed.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "unsubscribe_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
