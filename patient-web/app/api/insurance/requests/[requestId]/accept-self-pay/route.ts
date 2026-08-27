import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { parseInsuranceRequest } from "@/lib/api/insurance-request";

type Context = { params: Promise<{ requestId: string }> }; const idSchema = z.string().uuid();
export async function POST(request: Request, context: Context) {
  const { requestId } = await context.params;
  if (!idSchema.safeParse(requestId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const store = await cookies(); const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/insurance/requests/${requestId}/accept-self-pay`, { method: "POST", headers: { "idempotency-key": key } }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "self_pay_acceptance_failed", upstream.status);
  const result = parseInsuranceRequest(data);
  if (!result || result.id !== requestId || result.state !== "SELF_PAY_PENDING") return NextResponse.json({ message: "unexpected_insurance_request_response" }, { status: 502 });
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
