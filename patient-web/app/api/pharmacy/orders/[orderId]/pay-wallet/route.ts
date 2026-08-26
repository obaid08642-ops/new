import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ orderId: string }> };
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{6,80}$/);

/**
 * PH-PHARMACY wallet branch (parity #12): pays the selected offer from the
 * patient's wallet via the atomic guarded debit upstream. Form POST — the
 * idempotency key arrives as a form field.
 */
export async function POST(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const { orderId } = await context.params;
  if (!idSchema.safeParse(orderId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const form = await request.formData().then((fd) => Object.fromEntries(fd.entries())).catch(() => null);
  const parsedForm = z.object({ "idempotency-key": z.string().trim().min(16).max(128) }).loose().safeParse(form ?? {});
  if (!parsedForm.success) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const store = await cookies();
  const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });
  const locale = typeof form?.locale === "string" && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(form.locale) ? form.locale : "ar";

  const upstream = await callPatientApi(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}/pay-wallet`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": parsedForm.data["idempotency-key"] },
    body: JSON.stringify({}),
  }, token);
  const data: any = await upstream.json().catch(() => null);
  if (!upstream.ok || !data?.ok) {
    const reason = encodeURIComponent(String(data?.message || "wallet_payment_failed"));
    return NextResponse.redirect(new URL(`/${locale}/pharmacy/pay?orderId=${encodeURIComponent(orderId)}&error=${reason}`, request.url), 303);
  }
  return NextResponse.redirect(new URL(`/${locale}/orders/${encodeURIComponent(orderId)}?paid=wallet`, request.url), 303);
}
