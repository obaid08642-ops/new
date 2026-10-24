import { notFound, redirect } from "next/navigation";
import { callPatientApi } from "@/lib/api/upstream";
import { parseLegacyTracking, parseOrderDetail, parseOrderRows, type LegacyTracking, type OrderDetail, type OrderRow } from "@/lib/pharmacy/order-view";

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

/**
 * The order of the OLD flow (GET /orders/:id/tracking), which the app falls back to when the governed read does not know the
 * id (a legacy order opens the tracking screen from the order center). Null when the old flow does not know it either.
 */
export async function readLegacyTracking(orderId: string, token: string): Promise<LegacyTracking | null> {
  const response = await callPatientApi(`/orders/${encodeURIComponent(orderId)}/tracking`, {}, token).catch(() => null);
  if (!response?.ok) return null;
  return parseLegacyTracking(await response.json().catch(() => null));
}

/** The governed read of one order that reports a missing order instead of rendering the 404 page (the tracking screen then tries the old flow). */
export async function readOrderDetailOrMissing(locale: string, orderId: string, token: string): Promise<{ ok: true; detail: OrderDetail } | { ok: false; missing: boolean }> {
  const response = await callPatientApi(`/patient/pharmacy/orders/${orderId}`, {}, token);
  if (response.status === 401) redirect(`/${locale}/login`);
  if (response.status === 404) return { ok: false, missing: true };
  if (response.status === 403) notFound();
  if (!response.ok) return { ok: false, missing: false };
  const detail = parseOrderDetail(await response.json().catch(() => null), locale);
  return detail ? { ok: true, detail } : { ok: false, missing: false };
}
