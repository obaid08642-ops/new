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
  // #633: the cart holds lab tests (`<id>` or `lab_<id>`) and scans (`rad_<id>`). Each kind is asked of its own module, and a
  // cart with both keeps the providers that answer for every line (one provider runs the whole order at checkout).
  const labIds = testIds.filter((id) => !id.startsWith("rad_")).map((id) => id.replace(/^lab_/, ""));
  const scanIds = testIds.filter((id) => id.startsWith("rad_")).map((id) => id.slice(4)).filter(Boolean);
  const lists: Array<Array<Record<string, unknown>>> = [];
  for (const [path, ids] of [["/labs/compatible-providers?testIds=", labIds], ["/radiology/compatible-providers?serviceIds=", scanIds]] as const) {
    if (!ids.length) continue;
    const upstream = await callPatientApi(`${path}${ids.map(encodeURIComponent).join(",")}`, {}, accessToken);
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) return boundedUpstreamError(data, "compatible_labs_failed", upstream.status);
    const rows = Array.isArray(data) ? data : (data as { data?: unknown } | null)?.data;
    lists.push((Array.isArray(rows) ? rows : []).filter((row): row is Record<string, unknown> => !!row && typeof row === "object"));
  }
  const [first = [], ...rest] = lists;
  const common = first.filter((row) => rest.every((list) => list.some((other) => String(other.id ?? "") === String(row.id ?? ""))));
  return NextResponse.json(common, { headers: { "cache-control": "no-store" } });
}
