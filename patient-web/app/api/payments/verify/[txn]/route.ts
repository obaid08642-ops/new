import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

type Context = { params: Promise<{ txn: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(["pharmacy", "lab", "radiology", "nursing", "consultation", "insurance", "diagnostics"]);

/**
 * The payment result screen asks the backend for the real status of a transaction: `POST /payments/verify/:txn`
 * (owner-checked by the backend; it asks the payment provider and records the answer). Only the bounded fields the
 * screen needs go back to the browser: the backend's transaction document also holds provider secrets and payloads.
 */
export async function POST(request: Request, context: Context) {
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;
  const { txn } = await context.params;
  if (!UUID.test(txn)) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/payments/verify/${txn}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, token);
  const data: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "payment_verify_failed", upstream.status);
  const root = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const source = root?.data && typeof root.data === "object" && !Array.isArray(root.data) ? (root.data as Record<string, unknown>) : root;
  const status = typeof source?.status === "string" && source.status.length <= 40 ? source.status : null;
  if (!status) return NextResponse.json({ message: "unexpected_payment_verification_response" }, { status: 502 });
  const kind = typeof source?.booking_kind === "string" && KINDS.has(source.booking_kind) ? source.booking_kind : undefined;
  const booking = typeof source?.booking_id === "string" && UUID.test(source.booking_id) ? source.booking_id : undefined;
  return NextResponse.json(
    { transactionId: txn, status, ...(kind ? { bookingKind: kind } : {}), ...(booking ? { bookingId: booking } : {}) },
    { headers: { "cache-control": "no-store" } },
  );
}
