/**
 * Visit summary actions (owner decision 2026-10-24): after a completed appointment the patient's read carries what to do next,
 * built from the doctor's e-prescription and the doctor's medical order (lab and radiology items still open). The client starts
 * the pharmacy order, lab booking or scan booking in one tap through the existing endpoints:
 *   pharmacy_order    -> the e-prescription id (the existing prescription -> pharmacy order flow)
 *   lab_booking / radiology_booking -> POST /medical-orders/:medical_order_id/items/:first_item_id/order { group_all: true }
 *                                      answers the prefill, then the ordering flow books it.
 * Nothing is created here.
 */
export interface MedicalOrderLike {
  id: string;
  prescription_id?: string | null;
  valid_until?: Date | string | null;
  items?: Array<{ id: string; group: string; catalog_id: string; status: string }>;
}

export type FollowUpAction =
  | { kind: 'pharmacy_order'; prescription_id: string }
  | { kind: 'lab_booking' | 'radiology_booking'; medical_order_id: string; first_item_id: string; item_ids: string[]; catalog_ids: string[]; valid_until: string | null };

const GROUP_KIND: Record<string, 'lab_booking' | 'radiology_booking'> = { labs: 'lab_booking', radiology: 'radiology_booking' };
const MAX_PRESCRIPTIONS = 5;

export function buildFollowUpActions(appointmentPrescriptionIds: unknown, order: MedicalOrderLike | null, now = new Date()): FollowUpAction[] {
  const out: FollowUpAction[] = [];
  const seen = new Set<string>();
  const rx = [...(Array.isArray(appointmentPrescriptionIds) ? appointmentPrescriptionIds : []), order?.prescription_id]
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
  for (const id of rx) {
    if (seen.has(id) || seen.size >= MAX_PRESCRIPTIONS) continue;
    seen.add(id);
    out.push({ kind: 'pharmacy_order', prescription_id: id });
  }
  const validUntil = order?.valid_until ? new Date(order.valid_until) : null;
  const expired = !!validUntil && validUntil.getTime() <= now.getTime();
  if (order && !expired) {
    for (const [group, kind] of Object.entries(GROUP_KIND)) {
      const open = (order.items ?? []).filter((i) => i.group === group && i.status === 'open');
      if (!open.length) continue;
      out.push({ kind, medical_order_id: order.id, first_item_id: open[0].id, item_ids: open.map((i) => i.id), catalog_ids: open.map((i) => i.catalog_id), valid_until: validUntil ? validUntil.toISOString() : null });
    }
  }
  return out;
}
