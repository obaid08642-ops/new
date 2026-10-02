import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";
import { boundedUpstreamError } from "@/lib/api/error-response";

// R63: the checkout clears the server-side diagnostics cart after the order (the route did not exist).
export async function DELETE() {
  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi("/unified-bookings/diagnostics/cart", { method: "DELETE" }, token);
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) return boundedUpstreamError(data, "diagnostics_cart_clear_failed", upstream.status);
  return NextResponse.json(data ?? { ok: true }, { headers: { "cache-control": "no-store" } });
}
