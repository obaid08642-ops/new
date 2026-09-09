import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ memberId: string }> };
const idSchema = z.string().min(1).max(128);
const bodySchema = z.object({ permissions: z.array(z.string().min(1).max(64)).max(32) });

async function tokenOr401() {
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  return accessToken || null;
}

export async function PATCH(request: Request, context: Context) {
  const { memberId } = await context.params;
  if (!idSchema.safeParse(memberId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "invalid_permissions_payload" }, { status: 400 });
  const accessToken = await tokenOr401();
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    `/family/member/${encodeURIComponent(memberId)}/permissions`,
    { method: "PATCH", body: JSON.stringify({ permissions: parsed.data.permissions }) },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "permissions_update_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(_request: Request, context: Context) {
  const { memberId } = await context.params;
  if (!idSchema.safeParse(memberId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const accessToken = await tokenOr401();
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/family/remove-member/${encodeURIComponent(memberId)}`, { method: "DELETE" }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "member_remove_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
