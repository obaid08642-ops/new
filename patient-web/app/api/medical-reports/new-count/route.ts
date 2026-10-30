import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { getMyMedicalReports } from "@/lib/api/reports-server";
import { newOutcomeCount } from "@/lib/consult/outcomes";

/** The visit results the patient has not opened yet (GET /medical-reports/mine, rows of a visit with viewed_by_patient false): the badge of "My appointments". */
export async function GET() {
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401, headers: { "cache-control": "no-store" } });
  const upstream = await getMyMedicalReports(token);
  if (!upstream.ok) return NextResponse.json({ message: "reports_unavailable" }, { status: upstream.status === 401 ? 401 : 502, headers: { "cache-control": "no-store" } });
  const count = newOutcomeCount(await upstream.json().catch(() => null));
  return NextResponse.json({ count }, { headers: { "cache-control": "no-store" } });
}
