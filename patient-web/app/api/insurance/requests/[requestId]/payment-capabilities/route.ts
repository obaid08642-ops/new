import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ requestId: string }> };
const idSchema = z.string().uuid();
const modeSchema = z.enum(["copay", "self-pay"]);
const capabilitySchema = z.object({ booking_id: z.string().uuid(), amount: z.number().finite().positive(), currency: z.literal("SAR"), purpose: z.enum(["insurance_copay", "insurance_self_pay"]), methods: z.array(z.object({ id: z.enum(["card", "apple-pay", "google-pay"]), kind: z.literal("online") }).strict()) });

export async function GET(request: Request, context: Context) {
  const { requestId } = await context.params;
  if (!idSchema.safeParse(requestId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const mode = modeSchema.safeParse(new URL(request.url).searchParams.get("mode"));
  if (!mode.success) return NextResponse.json({ message: "invalid_payment_mode" }, { status: 400 });
  const store = await cookies(); const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const userAgent = request.headers.get("user-agent");
  const upstreamPath = mode.data === "copay" ? `/payments/insurance/${requestId}/capabilities` : `/payments/insurance/${requestId}/self-pay-capabilities`;
  const upstream = await callPatientApi(upstreamPath, { headers: userAgent ? { "user-agent": userAgent } : undefined }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "payment_capabilities_failed", upstream.status);
  const result = capabilitySchema.safeParse(data);
  const purposeMatchesMode = result.success && (mode.data === "copay" ? result.data.purpose === "insurance_copay" : result.data.purpose === "insurance_self_pay");
  if (!purposeMatchesMode || result.data.booking_id !== requestId) return NextResponse.json({ message: "unexpected_payment_capabilities_response" }, { status: 502 });
  return NextResponse.json(result.data, { headers: { "cache-control": "no-store" } });
}
