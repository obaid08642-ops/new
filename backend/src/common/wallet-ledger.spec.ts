import { postWalletEntry, walletLedgerBalance, WALLET_TX_INDEX, WalletInsufficientError } from './wallet-ledger';

/** A tiny in-memory store with the few operations the ledger uses (findOne, updateOne with upsert, aggregate by type). */
function fakeConn(wallets: any[], txs: any[] = []) {
  const eq = (doc: any, q: any) => Object.entries(q).every(([k, v]) => doc[k] === v);
  const collections: Record<string, any> = {
    wallets: {
      findOne: async (q: any) => wallets.find((w) => eq(w, q)) ?? null,
      updateOne: jest.fn(async (q: any, u: any, o?: any) => {
        const w = wallets.find((x) => eq(x, q) || x._id === q._id);
        if (w) { if (u.$set) Object.assign(w, u.$set); return {}; }
        if (o?.upsert) wallets.push({ _id: `doc-${wallets.length + 1}`, ...q, ...u.$setOnInsert });
        return {};
      }),
    },
    wallet_transactions: {
      createIndex: async () => ({}),
      deleteOne: jest.fn(async (q: any) => { const i = txs.findIndex((t) => eq(t, q)); if (i >= 0) txs.splice(i, 1); return {}; }),
      findOne: async (q: any) => txs.find((t) => eq(t, q)) ?? null,
      updateOne: jest.fn(async (q: any, u: any, o: any) => {
        if (txs.find((t) => eq(t, q))) return { upsertedCount: 0 };
        if (o?.upsert) { txs.push({ ...q, ...u.$setOnInsert }); return { upsertedCount: 1 }; }
        return { upsertedCount: 0 };
      }),
      aggregate: (pipeline: any[]) => ({ toArray: async () => ['credit', 'debit'].map((type) => ({ _id: type, total: txs.filter((t) => t.type === type && t.walletId === pipeline[0].$match.walletId).reduce((s, t) => s + t.amount, 0) })).filter((r) => r.total > 0) }),
    },
  };
  return { conn: { collection: (n: string) => collections[n] }, collections };
}
const wallet = () => ({ _id: 'w-doc', id: 'w1', ownerId: 'p1', ownerType: 'patient', balance: 0 });
const wallet2 = () => ({ _id: 'w-doc2', id: 'w2', ownerId: 'prov1', ownerType: 'provider', balance: 0 });
const entry = { ownerId: 'p1', ownerType: 'patient', amount: 40, type: 'credit' as const, referenceType: 'refund', referenceId: 'cancel_o1', description: 'x' };

describe('wallet entries go through the ledger, once per event', () => {
  it('writes a keyed ledger row and sets the balance to the ledger sum', async () => {
    const w = wallet(); const txs: any[] = [{ walletId: 'w1', type: 'credit', amount: 10, referenceType: 'topup', referenceId: 't1' }];
    const { conn } = fakeConn([w], txs);
    const out = await postWalletEntry(conn, entry);
    expect(out).toEqual({ credited: true, balance: 50 });
    expect(txs.at(-1)).toMatchObject({ idempotency_key: 'w1:credit:refund:cancel_o1', walletId: 'w1', amount: 40, type: 'credit' });
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

  it('the same reference on two wallets records both (a patient credit and a provider entry for one order)', async () => {
    const w1 = wallet(); const w2 = wallet2(); const txs: any[] = [{ walletId: 'w2', type: 'credit', amount: 100, referenceType: 'earning', referenceId: 'e1' }]; // the provider holds 100 to be debited from
    const { conn } = fakeConn([w1, w2], txs);
    const a = await postWalletEntry(conn, entry);
    const b = await postWalletEntry(conn, { ...entry, ownerId: 'prov1', ownerType: 'provider', type: 'debit' });
    expect([a.credited, b.credited]).toEqual([true, true]);
    expect(txs.map((t) => t.idempotency_key).filter(Boolean)).toEqual(['w1:credit:refund:cancel_o1', 'w2:debit:refund:cancel_o1']);
    const c = await postWalletEntry(conn, { ...entry, ownerId: 'prov1', ownerType: 'provider' });
    expect(c.credited).toBe(true); // same wallet and reference as the debit above, other direction
    expect(w1.balance).toBe(40);
  });

  it('a credit and then a debit with the same reference on one wallet are both recorded (a debit and its reversal)', async () => {
    const w = wallet(); const txs: any[] = [];
    const { conn } = fakeConn([w], txs);
    expect((await postWalletEntry(conn, entry)).credited).toBe(true);
    const back = await postWalletEntry(conn, { ...entry, type: 'debit', amount: 15 });
    expect(back).toEqual({ credited: true, balance: 25 });
    expect(txs.map((t) => t.type)).toEqual(['credit', 'debit']);
    expect(w.balance).toBe(25);
  });

  it('an exact repeat of either direction is recorded once', async () => {
    const w = wallet(); const txs: any[] = [];
    const { conn } = fakeConn([w], txs);
    await postWalletEntry(conn, entry);
    await postWalletEntry(conn, { ...entry, type: 'debit', amount: 15 });
    expect((await postWalletEntry(conn, entry)).credited).toBe(false);
    expect((await postWalletEntry(conn, { ...entry, type: 'debit', amount: 15 })).credited).toBe(false);
    expect(txs).toHaveLength(2);
    expect(w.balance).toBe(25);
  });

  it('the unique index is sparse, so rows written before the key existed (no key) do not collide', () => {
    expect(WALLET_TX_INDEX.keys).toEqual({ idempotency_key: 1 });
    expect(WALLET_TX_INDEX.options).toMatchObject({ unique: true, sparse: true });
  });

  it('a legacy row of the other direction does not block the new entry', async () => {
    const w = wallet(); const txs: any[] = [{ walletId: 'w1', type: 'debit', amount: 40, referenceType: 'refund', referenceId: 'cancel_o1' }];
    const { conn } = fakeConn([w], txs);
    expect((await postWalletEntry(conn, entry)).credited).toBe(true);
    expect(txs).toHaveLength(2);
  });

  it('a wallet is created for an owner who has none only when asked to (referral bonuses)', async () => {
    const wallets: any[] = []; const txs: any[] = [];
    const { conn } = fakeConn(wallets, txs);
    expect((await postWalletEntry(conn, entry)).credited).toBe(false);
    expect(wallets).toHaveLength(0);
    const out = await postWalletEntry(conn, entry, { createWalletIfMissing: true });
    expect(out).toEqual({ credited: true, balance: 40 });
    expect(wallets).toHaveLength(1);
    expect(wallets[0]).toMatchObject({ ownerId: 'p1', ownerType: 'patient', balance: 40 });
  });

  it('a debit larger than the ledger is refused and leaves no row behind', async () => {
    const w = wallet(); const txs: any[] = [{ walletId: 'w1', type: 'credit', amount: 10, referenceType: 'topup', referenceId: 't1' }];
    const { conn } = fakeConn([w], txs);
    await expect(postWalletEntry(conn, { ...entry, type: 'debit', amount: 25, referenceId: 'o9' })).rejects.toBeInstanceOf(WalletInsufficientError);
    expect(txs).toHaveLength(1);
    expect(await walletLedgerBalance(conn, 'w1')).toBe(10);
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
