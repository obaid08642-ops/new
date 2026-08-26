import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authCookieNames } from "@/lib/auth/cookies";
import { callPatientApi } from "@/lib/api/upstream";

import { assertSameOrigin } from "@/lib/api/csrf";

type Context = { params: Promise<{ orderId: string }> };
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{6,80}$/);

/** Card branch: server-priced intent for the selected offer snapshot → 303 hosted checkout. */
export async function POST(request: Request, context: Context) {
  { const csrf = assertSameOrigin(request as any); if (csrf) return csrf; }

  const { orderId } = await context.params;
  if (!idSchema.safeParse(orderId).success) return NextResponse.json({ message: "resource_not_found" }, { status: 404 });
  const form = await request.formData().then((fd) => Object.fromEntries(fd.entries())).catch(() => null);
  const parsedForm = z.object({ "idempotency-key": z.string().trim().min(16).max(128) }).loose().safeParse(form ?? {});
  if (!parsedForm.success) return NextResponse.json({ message: "idempotency_key_required" }, { status: 400 });
  const store = await cookies(); const token = store.get(authCookieNames.access)?.value;
  if (!token) return NextResponse.json({ message: "authentication_required" }, { status: 401 });

  const upstream = await callPatientApi(`/payments/intent/pharmacy-order/${encodeURIComponent(orderId)}`, {
    method: "POST",
    headers: { "idempotency-key": parsedForm.data["idempotency-key"] },
  }, token);
  const data: any = await upstream.json().catch(() => null);
  if (!upstream.ok || !data?.checkout_url) {
    return NextResponse.json({ message: data?.message || "payment_intent_failed" }, { status: upstream.ok ? 502 : upstream.status });
  }
  return NextResponse.redirect(new URL(String(data.checkout_url)), 303);
}
