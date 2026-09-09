import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ requestId: string }> };
const schema = z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().max(1000).optional().default("") });

export async function PUT(request: Request, context: Context) {
  const { requestId } = await context.params;
  if (!requestId || requestId.length > 128) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_decision_payload" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    `/family/permissions/respond/${encodeURIComponent(requestId)}`,
    { method: "PUT", body: JSON.stringify(parsed.data) },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "permission_respond_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
