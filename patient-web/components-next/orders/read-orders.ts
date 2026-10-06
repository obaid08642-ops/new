import { notFound, redirect } from "next/navigation";
import { callPatientApi } from "@/lib/api/upstream";
import { parseOrderDetail, parseOrderRows, type OrderDetail, type OrderRow } from "@/lib/pharmacy/order-view";

/**
 * The server reads of the order screens. A signed-out patient goes to sign-in, someone else's order or a missing one is
 * the 404 page, and any other failure comes back as `ok: false` so the screen can say so and offer a retry.
 */
export async function readOrderRows(locale: string, token: string): Promise<{ ok: true; rows: OrderRow[] } | { ok: false }> {
  const response = await callPatientApi("/patient/pharmacy/orders", {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return { ok: false };
  return { ok: true, rows: parseOrderRows(await response.json().catch(() => null)) };
}

export async function readOrderDetail(locale: string, orderId: string, token: string): Promise<{ ok: true; detail: OrderDetail } | { ok: false }> {
  const response = await callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok) return { ok: false };
  const detail = parseOrderDetail(await response.json().catch(() => null), locale);
  return detail ? { ok: true, detail } : { ok: false };
}
