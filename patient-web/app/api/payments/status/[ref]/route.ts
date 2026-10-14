import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { boundedUpstreamError } from "@/lib/api/error-response";
import { callPatientApi } from "@/lib/api/upstream";

type Context = { params: Promise<{ ref: string }> };
const REF = /^[A-Za-z0-9_-]{1,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(["pharmacy", "lab", "radiology", "nursing", "consultation", "insurance", "diagnostics"]);

/**
 * The stored status of one payment (`GET /payments/status/:ref`, read-only and owner-checked by the backend: no call to
 * the provider, no write). `ref` is our transaction id or the provider's payment id. The same bounded fields as the
 * verify route go back to the browser.
 */
export async function GET(_request: Request, context: Context) {
  const { ref } = await context.params;
  if (!REF.test(ref)) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/payments/status/${encodeURIComponent(ref)}`, {}, token);
  const data: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "payment_status_failed", upstream.status);
  const root = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const source = root?.data && typeof root.data === "object" && !Array.isArray(root.data) ? (root.data as Record<string, unknown>) : root;
  const status = typeof source?.status === "string" && source.status.length <= 40 ? source.status : null;
  const id = typeof source?.id === "string" && UUID.test(source.id) ? source.id : null;
  if (!status || !id) return NextResponse.json({ message: "unexpected_payment_status_response" }, { status: 502 });
  const kind = typeof source?.booking_kind === "string" && KINDS.has(source.booking_kind) ? source.booking_kind : undefined;
  const booking = typeof source?.booking_id === "string" && UUID.test(source.booking_id) ? source.booking_id : undefined;
  return NextResponse.json(
    { transactionId: id, status, ...(kind ? { bookingKind: kind } : {}), ...(booking ? { bookingId: booking } : {}) },
    { headers: { "cache-control": "no-store" } },
  );
}
