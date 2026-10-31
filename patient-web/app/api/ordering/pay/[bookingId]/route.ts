import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

const ID = /^[A-Za-z0-9_.:-]{1,128}$/;

/**
 * Starts the card payment of one ordering booking: POST /payments/intent/lab/:bookingId (the generic intent route; it charges the
 * booking's own server-side total and refuses an already-paid booking). The browser sends no amount. Only the checkout link and the
 * status go back. The idempotency key is required, so a repeated tap returns the same intent.
 */
export async function POST(request: Request, context: { params: Promise<{ bookingId: string }> }) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const { bookingId } = await context.params;
  if (!ID.test(bookingId)) return NextResponse.json({ message: "booking_not_found" }, { status: 404 });
  const key = request.headers.get("idempotency-key")?.trim() ?? "";
  if (key.length < 16 || key.length > 128) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  // a radiology booking (made on the radiology route) is paid on the radiology kind; the default is the lab kind
  const kind = new URL(request.url).searchParams.get("kind") === "radiology" ? "radiology" : "lab";
  const upstream = await callPatientApi(`/payments/intent/${kind}/${encodeURIComponent(bookingId)}`, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": key }, body: JSON.stringify({ method: "card" }) }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "payment_intent_failed", upstream.status);
  const o = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const src = o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : o;
  return NextResponse.json(
    { checkout_url: typeof src.checkout_url === "string" ? src.checkout_url : null, status: typeof src.status === "string" ? src.status : null },
    { headers: { "cache-control": "no-store" } },
  );
}
