import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

/**
 * PDPL Art. 20 (portability) and Art. 23 (erasure) for the web client.
 *
 * The privacy page only offered a link to /support asking the team to delete the
 * data "within 72 hours". That is a support ticket, not a data-subject right, and
 * it left the web client as the only surface without export or deletion. The
 * password is required on the DELETE so a stolen session token cannot erase an
 * account on its own.
 */
const eraseSchema = z.object({
  password: z.string().min(1).max(200),
  reason: z.string().max(200).optional(),
}).strict();

export async function GET() {
  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi("/users/me/data-export", {}, token);
  if (!upstream.ok) {
    const data = await upstream.json().catch(() => null);
    return boundedUpstreamError(data, "data_export_failed", upstream.status);
  }
  const payload = await upstream.json().catch(() => null);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="nabd-data-export.json"',
      "cache-control": "no-store",
    },
  });
}

export async function DELETE(request: Request) {
  const input = eraseSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_erasure_payload" }, { status: 400 });

  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi("/users/me", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "account_erasure_failed", upstream.status);

  // The account is gone: drop the session cookies so no stale token survives.
  const response = NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
  for (const name of Object.values(authCookieNames)) response.cookies.set(name, "", { maxAge: 0, path: "/" });
  return response;
}
