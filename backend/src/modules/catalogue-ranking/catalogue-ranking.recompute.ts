/**
 * The ranking job for the three service catalogues: recounts the orders from the bookings of the last 90 days, adds the stored daily counters, writes `rank_score` on
 * each catalogue row (only where it changed) and drops counters older than the window. Shared by the timer, the admin endpoint and `scripts/ranking-recompute.ts`.
 */
import {
  DAILY_COLLECTION, RANKED_VERTICALS, RANK_COLLECTION, WINDOW_DAYS, dayKey, scoreServices,
  type DayCounts, type RankedVertical,
} from './catalogue-ranking';

export interface Db {
  collection(name: string): {
    find(filter: Record<string, unknown>, options?: Record<string, unknown>): { toArray(): Promise<any[]> };
    aggregate(pipeline: Record<string, unknown>[]): { toArray(): Promise<any[]> };
    bulkWrite(ops: Record<string, unknown>[], options?: Record<string, unknown>): Promise<unknown>;
    deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount?: number }>;
    countDocuments(filter?: Record<string, unknown>): Promise<number>;
  };
}

/** Bookings that count as an order: not cancelled, rejected or expired. */
const DEAD = ['CANCELLED', 'cancelled', 'REJECTED', 'rejected', 'EXPIRED', 'expired', 'declined', 'DECLINED'];

async function ordersByDay(db: Db, vertical: RankedVertical, since: Date): Promise<DayCounts[]> {
  const day = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  const match = { createdAt: { $gte: since }, state: { $nin: DEAD }, status: { $nin: DEAD } };
  if (vertical === 'nursing') {
    const rows = await db.collection('homecarebookings').aggregate([{ $match: { createdAt: { $gte: since }, state: { $nin: DEAD } } }, { $group: { _id: { s: '$service_id', d: day }, n: { $sum: 1 } } }]).toArray();
    return rows.filter((r) => r._id?.s).map((r) => ({ service_id: String(r._id.s), day: r._id.d, orders: r.n }));
  }
  const coll = vertical === 'lab' ? 'labbookings' : 'radiologybookings';
  const rows = await db.collection(coll).aggregate([{ $match: match }, { $unwind: '$items' }, { $group: { _id: { s: '$items.service_id', d: day }, n: { $sum: 1 } } }]).toArray();
  return rows.filter((r) => r._id?.s).map((r) => ({ service_id: String(r._id.s), day: r._id.d, orders: r.n }));
}

export interface VerticalCounts { vertical: RankedVertical; rows: number; with_signals: number; changed: number; counter_days: number; orders_counted: number }

/** `write: false` is the dry run: the same numbers, nothing written. */
export async function recomputeCatalogueRanking(db: Db, write: boolean, now: Date = new Date()): Promise<VerticalCounts[]> {
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000);
  const out: VerticalCounts[] = [];
  for (const vertical of RANKED_VERTICALS) {
    const daily: DayCounts[] = (await db.collection(DAILY_COLLECTION).find({ vertical, day: { $gte: dayKey(since) } }, { projection: { _id: 0, service_id: 1, day: 1, views: 1, searches: 1, cart_adds: 1 } }).toArray()) as DayCounts[];
    const orders = await ordersByDay(db, vertical, since);
    const scores = scoreServices([...daily, ...orders], now);
    const rows = await db.collection(RANK_COLLECTION[vertical]).find({ id: { $type: 'string' } }, { projection: { _id: 1, id: 1, rank_score: 1 } }).toArray();
    const ops = rows.flatMap((r): Array<Record<string, unknown>> => {
      const next = scores.get(String(r.id)) ?? 0;
      const has = typeof r.rank_score === 'number';
      // Only a row with signals carries a score. A row without one has NO field (never 0): a service added after this run has no field either,
      // so both sort together by popularity instead of the new one being buried below every row that was given a 0.
      if (next > 0) return has && r.rank_score === next ? [] : [{ updateOne: { filter: { _id: r._id }, update: { $set: { rank_score: next } } } }];
      return has ? [{ updateOne: { filter: { _id: r._id }, update: { $unset: { rank_score: '' } } } }] : [];
    });
    if (write && ops.length) await db.collection(RANK_COLLECTION[vertical]).bulkWrite(ops, { ordered: false });
    if (write) await db.collection(DAILY_COLLECTION).deleteMany({ vertical, day: { $lt: dayKey(since) } });
    out.push({ vertical, rows: rows.length, with_signals: [...scores.values()].filter((v) => v > 0).length, changed: ops.length, counter_days: daily.length, orders_counted: orders.reduce((s, o) => s + (o.orders ?? 0), 0) });
  }
  return out;
}
