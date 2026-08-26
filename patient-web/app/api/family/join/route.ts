import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const bodySchema = z.object({
  invite_code: z.string().trim().min(4).max(40),
  display_name: z.string().trim().max(120).optional(),
  relation: z.string().trim().max(60).optional(),
});

/** Family parity #15: joins a group with an invite code. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi("/family/join", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(parsed.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "join_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
