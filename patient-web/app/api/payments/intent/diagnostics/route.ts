import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

// R63: the diagnostics checkout (components-next/diagnostics-checkout-form.tsx) posts here for card payment;
// the route did not exist, so every lab/radiology card payment on the website ended in "payment failed".
const bodySchema = z.object({
  order_id: z.string().uuid(),
  method: z.enum(["card", "apple-pay", "google-pay"]),
}).strict();

export async function POST(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const input = bodySchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ message: "invalid_payment_request" }, { status: 400 });
  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/payments/intent/diagnostics", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(input.data),
  }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "payment_intent_failed", upstream.status);
  return NextResponse.json(data ?? {}, { status: upstream.status, headers: { "cache-control": "no-store" } });
}
