import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ jti: string }> };

/**
 * Sign out one of the patient's own sessions (backend DELETE /users/me/sessions/:jti). The backend requires an idempotency key
 * on it and the patient API proxy does not forward one for DELETE, so this route adds it.
 */
export async function DELETE(_request: Request, context: Context) {
  const { jti } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(jti)) return NextResponse.json({ message: "invalid_session_id" }, { status: 400 });
  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/users/me/sessions/${encodeURIComponent(jti)}`, {
    method: "DELETE",
    headers: { "idempotency-key": `session-end-${crypto.randomUUID()}` },
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "session_end_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
