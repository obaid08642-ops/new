import { parseDeliveryAddresses, toBroadcastAddress, type DeliveryAddress } from "./delivery-address";
// no zod here: this module is in the client bundle of every sending screen, and zod probes for `eval`, which the page's CSP reports as a violation
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The created order's id from `{ id }` or `{ data: { id } }`, only when it is a UUID (a name like "cart" is not an order). */
function extractPatientPharmacyOrderId(value: unknown): string | null {
  const root = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  const inner = root?.data && typeof root.data === "object" && !Array.isArray(root.data) ? (root.data as Record<string, unknown>) : root;
  return typeof inner?.id === "string" && UUID.test(inner.id) ? inner.id : null;
}

/**
 * Sending a pharmacy request to the nearby pharmacies (handoff §1: the order is broadcast 3 -> 5 -> 8 km and the pharmacies
 * answer with offers). Two real calls, the same ones the mobile app makes: create the draft order, then submit it.
 * Both carry an idempotency key, so a retry after a dropped connection never creates a second order. Nothing here sets
 * a price, a payment or a total: those come from the pharmacy's offer.
 */

export type BroadcastFetch = (input: string, init?: RequestInit) => Promise<Response>;

export function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type AddressesResult =
  | { status: "ok"; addresses: DeliveryAddress[] }
  | { status: "unauthenticated" }
  | { status: "error" };

export async function loadDeliveryAddresses(doFetch: BroadcastFetch = fetch): Promise<AddressesResult> {
  try {
    const response = await doFetch("/api/patient/users/me/addresses", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) return { status: "unauthenticated" };
    if (!response.ok) return { status: "error" };
    return { status: "ok", addresses: parseDeliveryAddresses(await response.json().catch(() => null)) };
  } catch {
    return { status: "error" };
  }
}

export type BroadcastRequest =
  /** A named medicine the catalogue does not have (backend `manual_request`). */
  | { kind: "manual"; name: string; details: string }
  /** The medicines of a saved prescription (backend `prescription_id`); quantity is the pharmacy's to confirm. */
  | { kind: "prescription"; prescriptionId: string; names: string[] };

export function buildBroadcastBody(request: BroadcastRequest, address: DeliveryAddress & { lat: number; lng: number }) {
  const base = { delivery_address: toBroadcastAddress(address), fulfillment: "delivery", payment_mode: "cash" };
  if (request.kind === "manual") {
    const name = request.name.trim().slice(0, 200);
    const details = request.details.trim().slice(0, 500);
    return { ...base, manual_request: { name, details: details || null } };
  }
  return {
    ...base,
    items: request.names.map((name) => ({ raw_name: name.slice(0, 240), qty: 1, intake_source: "prescription" })),
    prescription_id: request.prescriptionId,
    prescription_attachments: [request.prescriptionId],
  };
}

export type BroadcastFailure = "unauthenticated" | "create_failed" | "no_order_id" | "submit_failed";
export type BroadcastResult = { ok: true; orderId: string } | { ok: false; reason: BroadcastFailure; status?: number };

const post = (doFetch: BroadcastFetch, path: string, key: string, body: unknown) =>
  doFetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(body),
  });

export async function sendBroadcast(
  request: BroadcastRequest,
  address: DeliveryAddress & { lat: number; lng: number },
  key: string,
  doFetch: BroadcastFetch = fetch,
): Promise<BroadcastResult> {
  try {
    const created = await post(doFetch, "/api/patient/patient/pharmacy/orders", key, buildBroadcastBody(request, address));
    if (created.status === 401) return { ok: false, reason: "unauthenticated", status: 401 };
    if (!created.ok) return { ok: false, reason: "create_failed", status: created.status };
    const orderId = extractPatientPharmacyOrderId(await created.json().catch(() => null));
    if (!orderId) return { ok: false, reason: "no_order_id" };
    const submitted = await post(doFetch, `/api/patient/patient/pharmacy/orders/${encodeURIComponent(orderId)}/submit`, `${key}-submit`, {});
    if (submitted.status === 401) return { ok: false, reason: "unauthenticated", status: 401 };
    if (!submitted.ok) return { ok: false, reason: "submit_failed", status: submitted.status };
    return { ok: true, orderId };
  } catch {
    return { ok: false, reason: "create_failed" };
  }
}
