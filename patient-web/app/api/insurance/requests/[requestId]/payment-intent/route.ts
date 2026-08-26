import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { createPatientPaymentIntent } from "@/lib/api/payments-server";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ requestId: string }> };
const idSchema = z.string().uuid();

/**
 * Co-pay hosted checkout (COPAY_PENDING): creates the server-priced intent for
 * kind=insurance (charges ONLY the approved copay_amount) and 303-redirects to
 * it. Form POST — the idempotency key arrives as a form field.
 */
export async function POST(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const { requestId } = await context.params;
  if (!idSchema.safeParse(requestId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const form = await request.formData().then((fd) => Object.fromEntries(fd.entries())).catch(() => null);
  const parsedForm = z.object({ "idempotency-key": z.string().trim().min(16).max(128) }).loose().safeParse(form ?? {});
  if (!parsedForm.success) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = createPatientPaymentIntent(token, "insurance", requestId, parsedForm.data["idempotency-key"]);
  if (!upstream) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const result = await upstream; const data: any = await result.json().catch(() => null);
  if (!result.ok || !data?.checkout_url) {
    return NextResponse.json({ message: data?.message || "payment_intent_failed" }, { status: result.ok ? 502 : result.status });
  }
  return NextResponse.redirect(new URL(String(data.checkout_url)), 303);
}
