import { notFound, redirect } from "next/navigation";
import { callPatientApi } from "@/lib/api/upstream";
import { capabilitiesFrom, parseOrderPaymentView, type CapabilitiesResult, type OrderPaymentView } from "@/lib/pharmacy/payment-state";

/**
 * The server reads of the payment screens. A signed-out patient goes to sign-in, someone else's order or a missing one
 * is the 404 page, and any other failure comes back as `ok: false` so the screen can say so and offer a retry.
 */
export async function readOrderPaymentView(locale: string, orderId: string, token: string): Promise<{ ok: true; view: OrderPaymentView } | { ok: false }> {
  const response = await callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return { ok: false };
  const view = parseOrderPaymentView(await response.json().catch(() => null));
  return view ? { ok: true, view } : { ok: false };
}

/** The amount due and the methods the server offers for the order (the server decides, from the accepted price or the patient's share). */
export async function readCapabilities(locale: string, orderId: string, token: string): Promise<CapabilitiesResult> {
  const response = await callPatientApi(`/payments/pharmacy/${orderId}/capabilities`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  return capabilitiesFrom(response.status, await response.json().catch(() => null), orderId);
}
