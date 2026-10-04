/**
 * F6 / R79b: loyalty award races.
 *
 * Regression tests for the two count-then-insert races the reviewer found:
 *  - 10 parallel awards with the same ref must produce exactly ONE transaction.
 *  - 10 parallel vitals awards must pay out at most the 5-per-day cap.
 *
 * The fake counter collection implements the same conditional $inc semantics as
 * Mongo's findOneAndUpdate({count: {$lt: cap}}, {$inc:{count}}) so the test would
 * fail against the old count-then-insert implementation.
 */
import { LoyaltyService } from './loyalty.service';

type Doc = Record<string, any>;

/** Minimal in-memory stand-in for loyalty_cap_counters with $lt + $inc semantics. */
function makeCapCollection() {
  const docs = new Map<string, Doc>();
  return {
    docs,
    async findOne(filter: any) {
      return docs.get(filter?._id) || null;
    },
    async findOneAndUpdate(filter: any, update: any) {
      const cur = docs.get(filter?._id);
      if (filter?.count?.$lte !== undefined && (!cur || !(cur.count <= filter.count.$lte))) return null;
      if (filter?.count?.$lt !== undefined && (!cur || !(cur.count < filter.count.$lt))) return null;
      if (cur) {
        cur.count += update.$inc.count;
        return cur;
      }
      // No document and the filter only restricts count: nothing to update.
      return null;
    },
    async insertOne(doc: Doc) {
      if (docs.has(doc._id)) {
        const err: any = new Error('E11000 duplicate key error');
        err.code = 11000;
        throw err;
      }
      docs.set(doc._id, { ...doc });
    },
  };
}

/** A txM double that enforces the uniq_user_reason_ref index like Mongo does. */
function makeTxCollection(docs: Doc[]) {
  const keyOf = (d: Doc) => `${d.user_id}|${d.reason}|${d.ref_type}|${d.ref_id}`;
  return {
    docs,
    async find(f: any) {
      const rows = docs.filter((d) => d.user_id === f.user_id && (!f.reason || d.reason === f.reason));
      return { lean: async () => rows };
    },
    async findOne(f: any) {
      return docs.find((d) => d.user_id === f.user_id && d.reason === f.reason && d.ref_type === f.ref_type && d.ref_id === f.ref_id) || null;
    },
    async create(d: Doc) {
      if (d.ref_id && docs.some((x) => keyOf(x) === keyOf(d))) {
        const err: any = new Error('E11000 duplicate key error collection uniq_user_reason_ref');
        err.code = 11000;
        throw err;
      }
      docs.push({ ...d });
      return d;
    },
  };
}

function makeAccountCollection() {
  const account: any = {
    user_id: 'u1',
    points: 0,
    lifetime_points: 0,
    tier: 'bronze',
  };
  return {
    account,
    async findOne() {
      return account;
    },
    async create() {
      return account;
    },
    async updateOne(_f: any, u: any) {
      if (u.$inc) {
        account.points += u.$inc.points || 0;
        account.lifetime_points += u.$inc.lifetime_points || 0;
      }
      return {};
    },
  };
}

function makeService(caps: any = null) {
  const capsCol = makeCapCollection();
  const txs: Doc[] = [];
  const txM = makeTxCollection(txs);
  const accountM = makeAccountCollection();
  // The double mutates its own account object; read the live value from it.
  const balance = accountM.account;
  const conn = {
    collection: (name: string) => {
      if (name === 'loyalty_cap_counters') return capsCol;
      if (name === 'loyalty_config') {
        return { async findOne() { return caps ? { value: { earn_caps: caps } } : null; } };
      }
      return { async findOne() { return null; }, async findOneAndUpdate() { return null; }, async insertOne() {} };
    },
  };
  const svc = new LoyaltyService(
    accountM as any,
    txM as any,
    { find: async () => [], updateOne: async () => ({}) } as any,
    { find: async () => [], updateOne: async () => ({}) } as any,
    { find: async () => [] } as any,
    { find: async () => [] } as any,
    { emit: () => true } as any,
    conn as any,
  );
  // Earn table: the reason is worth 10 points.
  (svc as any).earnTable = async () => ({ test_reason: 10, vitals_logged: 10 });
  (svc as any).updateChallengeProgress = async () => undefined;
  return { svc, txs, balance, capsCol };
}

describe('F6/R79b loyalty award races', () => {
  it('10 parallel awards with the same ref create exactly one transaction', async () => {
    const { svc, txs, balance } = makeService();

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        svc.awardPoints('u1', 'test_reason', 'order', 'order-1').catch((e: any) => ({ ok: false, error: String(e) })),
      ),
    );

    const duplicates = results.filter((r: any) => r?.duplicate).length;
    expect(duplicates).toBe(9);
    expect(txs.filter((t) => t.ref_id === 'order-1')).toHaveLength(1);
    // The balance must match the single transaction, never 10 awards.
    expect(balance.points).toBe(10);
  });

  it('10 parallel vitals awards pay out at most the 5-per-day cap', async () => {
    const { svc, txs } = makeService();

    await Promise.all(
      Array.from({ length: 10 }, () => (svc as any).onVitalsLogged({ user_id: 'u2' }).catch(() => undefined)),
    );

    const vitals = txs.filter((t) => t.reason === 'vitals_logged');
    expect(vitals.length).toBeLessThanOrEqual(5);
  });

  it('a configured daily cap holds under parallel awards', async () => {
    // Cap 25 points with a 10-point award: at most 2 awards (20 pts) may pay out.
    const { svc, txs } = makeService({ daily: { test_reason: 25 } });

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        svc.awardPoints('u3', 'test_reason', 'order', `order-${i}`).catch(() => undefined),
      ),
    );

    const rows = txs.filter((t) => t.user_id === 'u3');
    const paid = rows.reduce((s, r) => s + r.points_delta, 0);
    expect(paid).toBeLessThanOrEqual(25);
  });
});