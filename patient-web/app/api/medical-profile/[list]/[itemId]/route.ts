import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ list: string; itemId: string }> };
const LISTS = ["chronic-diseases", "allergies", "surgeries", "long-term-medications"] as const;

export async function DELETE(_request: Request, context: Context) {
  const { list, itemId } = await context.params;
  if (!(LISTS as readonly string[]).includes(list) || !itemId || itemId.length > 128) {
    return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  }
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    `/medical-profile/${list}/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "profile_delete_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
