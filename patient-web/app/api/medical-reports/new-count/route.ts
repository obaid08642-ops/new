import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { getOutcomesBadge } from "@/lib/api/outcomes-server";
import { readBadgeCount } from "@/lib/consult/outcomes";

/** The new visit results of the patient (GET /care/appointments/outcomes/badge, `unseen_total`): the badge of "My appointments". */
export async function GET() {
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401, headers: { "cache-control": "no-store" } });
  const upstream = await getOutcomesBadge(token);
  if (!upstream.ok) return NextResponse.json({ message: "reports_unavailable" }, { status: upstream.status === 401 ? 401 : 502, headers: { "cache-control": "no-store" } });
  const count = readBadgeCount(await upstream.json().catch(() => null));
  return NextResponse.json({ count }, { headers: { "cache-control": "no-store" } });
}
