import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { shareIdSchema } from "@/lib/consult/report-share";

/** Stop sharing the report with a doctor (DELETE /medical-reports/:id/share/:doctorId). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ reportId: string; doctorId: string }> }) {
  const { reportId, doctorId } = await params;
  if (!shareIdSchema.safeParse(reportId).success || !shareIdSchema.safeParse(doctorId).success) return NextResponse.json({ message: "invalid_share" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/medical-reports/${encodeURIComponent(reportId)}/share/${encodeURIComponent(doctorId)}`, { method: "DELETE" }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "revoke_failed", upstream.status);
  return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
