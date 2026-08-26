import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookieNames } from "@/lib/auth/cookies";
import { assertSameOrigin } from "@/lib/api/csrf";

const UPSTREAM = process.env.NABD_API_BASE_URL || "https://api.nabd.plus/api/v1";

export async function patientToken(): Promise<string | null> {
  return (await cookies()).get(authCookieNames.access)?.value ?? null;
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data as any, { status, headers: { "cache-control": "no-store" } });
}

/** Shared guard: CSRF + auth + zod body. Returns either token or a Response. */
export async function guard(
  request: Request,
  schema: z.ZodTypeAny | null,
): Promise<{ token: string; body: any } | { error: NextResponse }> {
  const csrf = assertSameOrigin(request);
  if (csrf) return { error: csrf };
  const token = await patientToken();
  if (!token) return { error: json({ message: "unauthenticated" }, 401) };
  let body: any = {};
  if (schema) {
    const raw = await request.json().catch(() => null);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return { error: json({ message: "invalid_payload" }, 400) };
    body = parsed.data;
  }
  return { token, body };
}

async function call(path: string, init: RequestInit, token: string) {
  try {
    const res = await fetch(`${UPSTREAM}${path}`, {
      ...init,
      headers: new Headers({ Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers as any) }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 503, data: { message: "upstream_unavailable" } };
  }
}

const itemsSchema = z.object({
  medicine_id: z.string().min(1).max(120),
  qty: z.number().int().min(1).max(20),
}).array().min(1).max(30);

const addressSchema = z.object({
  label: z.string().max(80).optional(),
  street: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ═══ PH-PHARMACY BFF contracts ═══
export async function createAndSendOrder(token: string, input: { items: Array<{ medicine_id: string; qty: number }>; delivery_address: any; delivery_mode?: "DELIVERY" | "PICKUP"; notes?: string }) {
  const created = await call("/patient/pharmacy/orders", { method: "POST", body: JSON.stringify(input) }, token);
  if (!created.ok || !created.data?.id) return created;
  const orderId = created.data.id;
  // Governing rule: sending broadcasts to pharmacies WITHOUT any payment step.
  return call(`/patient/pharmacy/orders/${orderId}/submit`, { method: "POST" }, token).then((r) => ({ ...r, data: { ...r.data, order_id: orderId } }));
}

export function getOffers(token: string, orderId: string) {
  return call(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}/offers`, { method: "GET" }, token);
}

export function selectOffer(token: string, orderId: string, pharmacyAccountId: string) {
  return call(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}/select-offer`, { method: "POST", body: JSON.stringify({ pharmacy_account_id: pharmacyAccountId }) }, token);
}

export function registerCod(token: string, orderId: string) {
  return call(`/patient/pharmacy/orders/${encodeURIComponent(orderId)}/cod`, { method: "POST" }, token);
}

/** Payment intent — amount resolved SERVER-side from selected_offer snapshot. */
export function paymentIntent(token: string, orderId: string) {
  return call(`/payments/intent/pharmacy-order/${encodeURIComponent(orderId)}`, { method: "POST", headers: { "Idempotency-Key": `web-${orderId}-${Date.now()}` } }, token);
}

export const createOrderSchema = z.object({
  items: itemsSchema,
  delivery_address: addressSchema,
  delivery_mode: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
  notes: z.string().max(500).optional(),
});
