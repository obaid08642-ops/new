import { applyMarketBackfill, planMarketBackfill, MARKET_BACKFILL_COLLECTIONS } from './market-backfill';

/** Tiny in-memory Db: collections of docs; supports the four calls the backfill uses. */
function fakeDb(data: Record<string, Array<Record<string, unknown>>>) {
  const col = (name: string) => {
    const docs = data[name] ?? (data[name] = []);
    const missing = (d: Record<string, unknown>) => d.market_id === undefined;
    return {
      countDocuments: async () => docs.filter(missing).length,
      find: () => ({ limit: (n: number) => ({ toArray: async () => docs.filter(missing).slice(0, n).map((d) => ({ _id: d._id })) }) }),
      updateMany: async (f: { _id: { $in: unknown[] } }, u: { $set: Record<string, unknown> }) => {
        let modifiedCount = 0;
        for (const d of docs) if (f._id.$in.includes(d._id) && missing(d)) { Object.assign(d, u.$set); modifiedCount++; }
        return { modifiedCount };
      },
    };
  };
  return { collection: col } as never;
}

describe('market backfill', () => {
  it('covers the money and identity collections and not the global ones', () => {
    for (const c of ['orders', 'wallets', 'users', 'provider_profiles', 'einvoices', 'transactions', 'pharmacy_offers']) expect(MARKET_BACKFILL_COLLECTIONS).toContain(c);
    for (const c of ['feature_flags', 'system_configs', 'notification_templates', 'conditions']) expect(MARKET_BACKFILL_COLLECTIONS).not.toContain(c);
    expect(new Set(MARKET_BACKFILL_COLLECTIONS).size).toBe(MARKET_BACKFILL_COLLECTIONS.length);
  });
  it('dry run counts only and writes nothing', async () => {
    const data = { orders: [{ _id: 1 }, { _id: 2, market_id: 'SA' }, { _id: 3 }] };
    const plan = await planMarketBackfill(fakeDb(data), ['orders']);
    expect(plan).toEqual([{ collection: 'orders', missing: 2 }]);
    expect(data.orders[0]).toEqual({ _id: 1 });
  });
  it('stamps SA on missing documents in batches, leaves existing markets alone, and is idempotent', async () => {
    const data = { orders: [{ _id: 1 }, { _id: 2, market_id: 'EG', operator_id: 'op-eg' }, { _id: 3 }, { _id: 4 }, { _id: 5 }] };
    const db = fakeDb(data);
    const r1 = await applyMarketBackfill(db, { collections: ['orders'], batch: 2 });
    expect(r1.written).toBe(4);
    expect(data.orders.map((d) => d.market_id)).toEqual(['SA', 'EG', 'SA', 'SA', 'SA']);
    expect(data.orders[1]).toEqual({ _id: 2, market_id: 'EG', operator_id: 'op-eg' });
    expect(data.orders[0]).toMatchObject({ operator_id: 'op-sa-default' });
    const r2 = await applyMarketBackfill(db, { collections: ['orders'], batch: 2 });
    expect(r2.written).toBe(0);
  });
});
