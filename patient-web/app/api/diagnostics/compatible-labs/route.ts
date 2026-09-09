import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const testIds = (url.searchParams.get("testIds") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (!testIds.length) return NextResponse.json({ message: "testIds_required" }, { status: 400 });
  const store = await cookies();
  const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(
    `/labs/compatible-providers?testIds=${testIds.map(encodeURIComponent).join(",")}`,
    {},
    accessToken,
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "compatible_labs_failed", upstream.status);
  return NextResponse.json(data ?? [], { headers: { "cache-control": "no-store" } });
}
