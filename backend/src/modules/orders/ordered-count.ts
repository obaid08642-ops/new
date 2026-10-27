/**
 * "Most ordered": a delivered order adds 1 to `orders_count` of every distinct product in it (a unit count would let one bulk order
 * outrank products many patients ordered). One updateMany for the whole order, never one write per line.
 * Called once, when the order reaches DELIVERED; a failure never blocks the delivery (the recount in
 * scripts/migrations/2026-10-medicine-orders-count.ts recomputes the field from the delivered orders).
 */
export async function countDeliveredOrder(conn: { collection(name: string): any }, items: unknown): Promise<number> {
  const ids = [...new Set((Array.isArray(items) ? items : []).map((it: any) => it?.medicine_id).filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))];
  if (!ids.length) return 0;
  const res = await conn.collection('medicines').updateMany({ id: { $in: ids } }, { $inc: { orders_count: 1 } }).catch(() => null);
  return res?.modifiedCount ?? 0;
}

/**
 * The same count recomputed from the orders themselves: delivered orders, one row per (order, product), then the number of orders per product.
 * Used by scripts/migrations/2026-10-medicine-orders-count.ts to fill `orders_count` for orders delivered before the counter existed.
 */
export const DELIVERED_COUNT_PIPELINE: Record<string, unknown>[] = [
  { $match: { state: 'DELIVERED' } },
  { $unwind: '$items' },
  { $match: { 'items.medicine_id': { $type: 'string', $ne: '' } } },
  { $group: { _id: { order: '$id', medicine: '$items.medicine_id' } } },
  { $group: { _id: '$_id.medicine', orders: { $sum: 1 } } },
];

/**
 * Fills `orders_count` from the delivered orders (the recount). Dry run unless `apply`: it only counts what would change. Only products
 * that exist are touched, only where the stored number differs, and only `orders_count` is set, so a second run changes nothing.
 * Used by scripts/migrations/2026-10-medicine-orders-count.ts and by src/scripts/ranking-recompute.ts (the server task).
 */
export async function recountDeliveredOrders(conn: { collection(name: string): any }, apply: boolean): Promise<{ products_with_delivered_orders: number; differs: number; modified: number }> {
  const counts: Array<{ _id: string; orders: number }> = await conn.collection('orders').aggregate(DELIVERED_COUNT_PIPELINE as any, { allowDiskUse: true }).toArray();
  const meds = conn.collection('medicines');
  let differs = 0;
  let modified = 0;
  for (let i = 0; i < counts.length; i += 500) {
    const batch = counts.slice(i, i + 500);
    const have = new Map<string, number>(
      (await meds.find({ id: { $in: batch.map((c) => c._id) } }, { projection: { _id: 0, id: 1, orders_count: 1 } }).toArray()).map((m: any) => [m.id, Number(m.orders_count) || 0] as [string, number]),
    );
    const todo = batch.filter((c) => have.has(c._id) && have.get(c._id) !== c.orders);
    differs += todo.length;
    if (apply && todo.length) {
      const res = await meds.bulkWrite(todo.map((c) => ({ updateOne: { filter: { id: c._id }, update: { $set: { orders_count: c.orders } } } })), { ordered: false });
      modified += res.modifiedCount;
    }
  }
  return { products_with_delivered_orders: counts.length, differs, modified };
}
