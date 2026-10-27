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
