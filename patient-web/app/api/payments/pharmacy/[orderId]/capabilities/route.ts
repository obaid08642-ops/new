import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

type Context = { params: Promise<{ orderId: string }> };
const idSchema = z.string().uuid();
const capabilitySchema = z.object({
  booking_id: z.string().uuid(), amount: z.number().finite().nonnegative(), currency: z.literal("SAR"),
  methods: z.array(z.object({ id: z.enum(["card", "apple-pay", "google-pay"]), kind: z.literal("online") }).strict()),
});

export async function GET(request: Request, context: Context) {
  const { orderId } = await context.params;
  if (!idSchema.safeParse(orderId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const store = await cookies(); const accessToken = store.get(authCookieNames.access)?.value;
  if (!accessToken) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const userAgent = request.headers.get("user-agent");
  const upstream = await callPatientApi(`/payments/pharmacy/${orderId}/capabilities`, { headers: userAgent ? { "user-agent": userAgent } : undefined }, accessToken);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "payment_capabilities_failed", upstream.status);
  const result = capabilitySchema.safeParse(data);
  if (!result.success || result.data.booking_id !== orderId) return NextResponse.json({ message: "unexpected_payment_capabilities_response" }, { status: 502 });
  return NextResponse.json(result.data, { headers: { "cache-control": "no-store" } });
}
