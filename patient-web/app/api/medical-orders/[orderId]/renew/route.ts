import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

/**
 * M6 Ord21: "Ask for a renewal" on an expired or expiring order. POST /medical-orders/:id/renew-request (the doctor sees it in
 * their renew list). The form posts `next`, a path on this site only; the result is shown there as ?renew=sent or ?renew=error.
 */
type Context = { params: Promise<{ orderId: string }> };
const ID = /^[A-Za-z0-9-]{8,64}$/;

export async function POST(request: Request, context: Context) {
  const { orderId } = await context.params;
  const form = await request.formData().catch(() => null);
  const value = form?.get("next");
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return NextResponse.json({ message: "invalid_next" }, { status: 400 });
  const back = new URL(value, request.url);
  if (!ID.test(orderId)) return NextResponse.redirect(back, 303);
  const token = (await cookies()).get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const upstream = await callPatientApi(`/medical-orders/${encodeURIComponent(orderId)}/renew-request`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", cache: "no-store" }, token);
  const target = new URL(back.pathname, request.url);
  target.searchParams.set("renew", upstream.ok ? "sent" : "error");
  return NextResponse.redirect(target, 303);
}
