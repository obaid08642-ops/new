import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { parseReportShares, shareIdSchema } from "@/lib/consult/report-share";

type Ctx = { params: Promise<{ reportId: string }> };
const bodySchema = z.object({ doctor_profile_id: shareIdSchema, doctor_name: z.string().trim().max(160).optional() }).strict();

/** Who the report is shared with (GET /medical-reports/:id). */
export async function GET(_request: Request, { params }: Ctx) {
  const { reportId } = await params;
  if (!shareIdSchema.safeParse(reportId).success) return NextResponse.json({ message: "invalid_report" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/medical-reports/${encodeURIComponent(reportId)}`, {}, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "report_unavailable", upstream.status);
  return NextResponse.json({ shares: parseReportShares(data) }, { headers: { "cache-control": "no-store" } });
}

/** Share the report with a doctor (POST /medical-reports/:id/share). */
export async function POST(request: Request, { params }: Ctx) {
  const { reportId } = await params;
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success || !shareIdSchema.safeParse(reportId).success) return NextResponse.json({ message: "invalid_share" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/medical-reports/${encodeURIComponent(reportId)}/share`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input.data) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "share_failed", upstream.status);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
