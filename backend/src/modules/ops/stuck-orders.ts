/**
 * Issue 1236: one definition of a "stuck" order, read by the ops alerts (admin Today screen) and by the orders console
 * problem filter. An order is stuck when it has stayed in one of these in-flight states longer than the threshold.
 * pharmacy_orders.status holds the lower-case PharmacyOrderState values; the old table named upper-case states that
 * never matched, so stuck pharmacy orders were never reported.
 */
export const STUCK_STATES: Record<string, { collection: string; field: string; states: string[] }> = {
  pharmacy: { collection: 'pharmacy_orders', field: 'status', states: ['ready_for_split', 'broadcasting', 'awaiting_full_acceptance', 'allocating', 'partially_allocated', 'fully_allocated', 'manual_review', 'confirmed'] },
  lab: { collection: 'labbookings', field: 'state', states: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'CONFIRMED'] },
  radiology: { collection: 'radiologybookings', field: 'state', states: ['NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'CONFIRMED'] },
  nursing: { collection: 'homecarebookings', field: 'state', states: ['NEW_REQUEST', 'PENDING_INSURANCE', 'CONFIRMED', 'ASSIGNED'] },
  consultation: { collection: 'appointments', field: 'status', states: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
};

/** Minutes after which an in-flight order counts as stuck: the admin setting (orders console config), else 30. */
export async function stuckMinutes(conn: { collection(name: string): any }): Promise<number> {
  try {
    const doc = await conn.collection('system_configs').findOne({ key: 'orders_console_config' });
    const n = Number(doc?.value?.stuck_minutes);
    if (Number.isFinite(n) && n >= 1) return n;
  } catch { /* the older key below */ }
  try {
    const legacy = await conn.collection('system_config').findOne({ key: 'system_config' });
    const n = Number(legacy?.value?.ops_stuck_minutes);
    if (Number.isFinite(n) && n >= 1) return n;
  } catch { /* the default */ }
  return 30;
}
