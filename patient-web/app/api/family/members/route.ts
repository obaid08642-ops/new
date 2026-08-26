import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

/** Family manage panel data source — auth-scoped upstream list (GET /family/members). */
export async function GET() {
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/family/members", {}, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return NextResponse.json(data || { message: "family_members_failed" }, { status: upstream.status });
  return NextResponse.json(data, { status: 200, headers: { "cache-control": "no-store" } });
}
