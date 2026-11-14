/**
 * The one-tap buttons after a completed visit (owner 2026-10-24). The server lists what applies (`follow_up_actions`, backend
 * care/follow-up-actions.ts): `{ kind: "pharmacy_order", prescription_id }` and
 * `{ kind: "lab_booking" | "radiology_booking", medical_order_id, first_item_id, item_ids, catalog_ids, valid_until }`.
 * Only those are shown; an expired lab/scan action (valid_until in the past) is hidden.
 */
export type FollowUpAction =
  | { kind: "pharmacy_order"; prescriptionId: string }
  | { kind: "lab_booking" | "radiology_booking"; medicalOrderId: string; firstItemId: string; itemCount: number };

const ID = /^[A-Za-z0-9-]{8,64}$/;
const str = (v: unknown): string | null => (typeof v === "string" && ID.test(v) ? v : null);

export function parseFollowUpActions(value: unknown, now: number = Date.now()): FollowUpAction[] {
  if (!Array.isArray(value)) return [];
  const out: FollowUpAction[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const r = entry && typeof entry === "object" && !Array.isArray(entry) ? (entry as Record<string, unknown>) : null;
    if (!r) continue;
    if (r.kind === "pharmacy_order") {
      const id = str(r.prescription_id);
      if (id && !seen.has(`p:${id}`)) { seen.add(`p:${id}`); out.push({ kind: "pharmacy_order", prescriptionId: id }); }
    } else if (r.kind === "lab_booking" || r.kind === "radiology_booking") {
      const orderId = str(r.medical_order_id);
      const first = str(r.first_item_id);
      if (!orderId || !first || seen.has(r.kind)) continue;
      if (typeof r.valid_until === "string" && Date.parse(r.valid_until) <= now) continue;
      seen.add(r.kind);
      out.push({ kind: r.kind, medicalOrderId: orderId, firstItemId: first, itemCount: Array.isArray(r.item_ids) ? r.item_ids.length : 0 });
    }
  }
  return out;
}

/** pharmacy order: the existing rx-order flow. */
export const pharmacyOrderHref = (locale: string, prescriptionId: string) => `/${locale}/pharmacy/rx-order?prescriptionId=${encodeURIComponent(prescriptionId)}`;
/** lab / scan: the same route handler the medical order's group Order button posts to (it returns the prefill), then the ordering flow. */
export const medicalOrderActionPath = (a: { medicalOrderId: string; firstItemId: string }) => `/api/medical-orders/${encodeURIComponent(a.medicalOrderId)}/items/${encodeURIComponent(a.firstItemId)}/order`;
export const bookingFlowHref = (locale: string, kind: "lab_booking" | "radiology_booking") => `/${locale}/diagnostics?kind=${kind === "lab_booking" ? "labs" : "radiology"}`;
