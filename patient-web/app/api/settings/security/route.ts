import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

const passwordSchema = z.object({
  kind: z.literal("password"),
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(8).max(200),
});
const securitySchema = z.object({
  kind: z.literal("security"),
  biometric: z.boolean().optional(),
  two_factor: z.boolean().optional(),
});
const bodySchema = z.discriminatedUnion("kind", [passwordSchema, securitySchema]);

/** Settings security (parity #28 completion): re-auth password rotation + toggles. */
export async function POST(request: Request) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_security_payload" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const path = parsed.data.kind === "password" ? "/users/me/change-password" : "/users/me/security-settings";
  const payload = parsed.data.kind === "password"
    ? { current_password: parsed.data.current_password, new_password: parsed.data.new_password }
    : parsed.data;
  const upstream = await callPatientApi(path, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(payload),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "security_update_failed" }, { status: upstream.status });
  return NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
