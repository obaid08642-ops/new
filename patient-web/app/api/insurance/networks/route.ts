import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { parseNetworks } from "@/lib/insurance/view";

/** The networks of one insurer (GET /insurance/companies/:id/networks), for the add-policy form's network chips. */
export async function GET(request: Request) {
  const companyId = new URL(request.url).searchParams.get("company_id") ?? "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(companyId)) return NextResponse.json({ message: "invalid_company" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/insurance/companies/${encodeURIComponent(companyId)}/networks`, {}, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "networks_unavailable", upstream.status);
  return NextResponse.json({ networks: parseNetworks(data) }, { headers: { "cache-control": "no-store" } });
}
