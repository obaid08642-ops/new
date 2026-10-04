import { NextResponse } from "next/server";
import { callPatientApi } from "@/lib/api/upstream";

/** F71: public intent parsing proxy (no auth needed — backend route is @Public). */
export async function POST(req: Request) {
  let query = "";
  let locale = "ar";
  let category: string | undefined;
  let scope: string | undefined;
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body.query === "string") query = body.query.slice(0, 200);
    if (body && typeof body.locale === "string") locale = body.locale.slice(0, 8);
    // 13.R7: category/scope passthrough for scoped search.
    if (body && typeof body.category === "string" && body.category.trim()) category = body.category.slice(0, 32);
    if (body && typeof body.scope === "string" && body.scope.trim()) scope = body.scope.slice(0, 64);
  } catch { /* body optional */ }
  if (!query.trim()) return NextResponse.json({ message: "query_required" }, { status: 400 });
  const upstream = await callPatientApi("/search/intent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: query.trim(),
      locale,
      client_type: "web",
      ...(category ? { category } : {}),
      ...(scope ? { scope } : {}),
    }),
  });
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json({ message: "intent_failed" }, { status: 502 });
  return NextResponse.json(data, { headers: { "cache-control": "no-store" } });
}
