import { postWalletEntry, walletLedgerBalance } from './wallet-ledger';

/** A tiny in-memory store with the few operations the ledger uses (findOne, updateOne with upsert, aggregate by type). */
function fakeConn(wallets: any[], txs: any[] = []) {
  const eq = (doc: any, q: any) => Object.entries(q).every(([k, v]) => doc[k] === v);
  const collections: Record<string, any> = {
    wallets: {
      findOne: async (q: any) => wallets.find((w) => eq(w, q)) ?? null,
      updateOne: jest.fn(async (q: any, u: any) => { const w = wallets.find((x) => eq(x, q) || x._id === q._id); if (w) Object.assign(w, u.$set); return {}; }),
    },
    wallet_transactions: {
      createIndex: async () => ({}),
      findOne: async (q: any) => txs.find((t) => eq(t, q)) ?? null,
      updateOne: jest.fn(async (q: any, u: any, o: any) => {
        if (txs.find((t) => eq(t, q))) return { upsertedCount: 0 };
        if (o?.upsert) { txs.push({ ...q, ...u.$setOnInsert }); return { upsertedCount: 1 }; }
        return { upsertedCount: 0 };
      }),
      aggregate: () => ({ toArray: async () => ['credit', 'debit'].map((type) => ({ _id: type, total: txs.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0) })).filter((r) => r.total > 0) }),
    },
  };
  return { conn: { collection: (n: string) => collections[n] }, collections };
}
const wallet = () => ({ _id: 'w-doc', id: 'w1', ownerId: 'p1', ownerType: 'patient', balance: 0 });
const entry = { ownerId: 'p1', ownerType: 'patient', amount: 40, type: 'credit' as const, referenceType: 'refund', referenceId: 'cancel_o1', description: 'x' };

describe('wallet entries go through the ledger, once per event', () => {
  it('writes a keyed ledger row and sets the balance to the ledger sum', async () => {
    const w = wallet(); const txs: any[] = [{ walletId: 'w1', type: 'credit', amount: 10, referenceType: 'topup', referenceId: 't1' }];
    const { conn } = fakeConn([w], txs);
    const out = await postWalletEntry(conn, entry);
    expect(out).toEqual({ credited: true, balance: 50 });
    expect(txs.at(-1)).toMatchObject({ idempotency_key: 'refund:cancel_o1', walletId: 'w1', amount: 40, type: 'credit' });
    expect(w.balance).toBe(50);
  });

  it('the same event twice credits once', async () => {
    const w = wallet(); const txs: any[] = [];
    const { conn } = fakeConn([w], txs);
    await postWalletEntry(conn, entry);
    const again = await postWalletEntry(conn, entry);
    expect(again.credited).toBe(false);
    expect(txs).toHaveLength(1);
    expect(w.balance).toBe(40);
  });

  it('a row written before the key existed (same reference) is not credited again', async () => {
    const w = wallet(); const txs: any[] = [{ walletId: 'w1', type: 'credit', amount: 40, referenceType: 'refund', referenceId: 'cancel_o1' }];
    const { conn } = fakeConn([w], txs);
    expect((await postWalletEntry(conn, entry)).credited).toBe(false);
    expect(txs).toHaveLength(1);
  });

  it('no wallet, or a non-positive amount, records nothing', async () => {
    const { conn, collections } = fakeConn([], []);
    expect(await postWalletEntry(conn, entry)).toEqual({ credited: false, balance: null });
    expect(await postWalletEntry(conn, { ...entry, amount: 0 })).toEqual({ credited: false, balance: null });
    expect(collections.wallet_transactions.updateOne).not.toHaveBeenCalled();
  });

  it('the balance is credits minus debits', async () => {
    const { conn } = fakeConn([wallet()], [{ walletId: 'w1', type: 'credit', amount: 100 }, { walletId: 'w1', type: 'debit', amount: 30.5 }]);
    expect(await walletLedgerBalance(conn, 'w1')).toBe(69.5);
  });
});
