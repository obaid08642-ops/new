import { BadRequestException } from '@nestjs/common';
import { NabdExtensionsService } from './nabd-extensions.service';

// processWalletTransaction goes through the wallet ledger: the referral bonus credits two wallets for one reward, once each.
describe('NabdExtensionsService wallet entries', () => {
  function svc() {
    const wallets: any[] = []; const txs: any[] = [];
    const eq = (d: any, q: any) => Object.entries(q).every(([k, v]) => d[k] === v);
    const cols: Record<string, any> = {
      wallets: {
        findOne: async (q: any) => wallets.find((w) => eq(w, q)) ?? null,
        updateOne: async (q: any, u: any, o?: any) => { const w = wallets.find((x) => eq(x, q) || x._id === q._id); if (w) { if (u.$set) Object.assign(w, u.$set); } else if (o?.upsert) wallets.push({ _id: `d${wallets.length}`, ...q, ...u.$setOnInsert }); return {}; },
      },
      wallet_transactions: {
        createIndex: async () => ({}), deleteOne: async (q: any) => { const i = txs.findIndex((t) => eq(t, q)); if (i >= 0) txs.splice(i, 1); return {}; },
        findOne: async (q: any) => txs.find((t) => eq(t, q)) ?? null,
        updateOne: async (q: any, u: any) => { if (txs.find((t) => eq(t, q))) return { upsertedCount: 0 }; txs.push({ ...q, ...u.$setOnInsert }); return { upsertedCount: 1 }; },
        aggregate: (pipeline: any[]) => ({ toArray: async () => ['credit', 'debit'].map((type) => ({ _id: type, total: txs.filter((t) => t.type === type && t.walletId === pipeline[0].$match.walletId).reduce((s, t) => s + t.amount, 0) })).filter((r) => r.total > 0) }),
      },
    };
    const s = Object.create(NabdExtensionsService.prototype) as any;
    s.conn = { collection: (n: string) => cols[n] };
    return { s: s as NabdExtensionsService, wallets, txs };
  }
  const credit = { ownerId: 'p1', ownerType: 'patient' as const, amount: 50, type: 'credit' as const, referenceType: 'referral' as const, referenceId: 'reward-1', description: 'bonus' };

  it('creates the wallet and records the credit through the ledger', async () => {
    const { s, wallets, txs } = svc();
    await s.processWalletTransaction(credit);
    expect(wallets[0]).toMatchObject({ ownerId: 'p1', balance: 50 });
    expect(txs[0]).toMatchObject({ type: 'credit', amount: 50, idempotency_key: `${wallets[0].id}:credit:referral:reward-1` });
  });

  it('the referrer and the referee, same reward id, each get their own credit', async () => {
    const { s, wallets, txs } = svc();
    await s.processWalletTransaction(credit);
    await s.processWalletTransaction({ ...credit, ownerId: 'p2' });
    expect(txs).toHaveLength(2);
    expect(wallets.map((w) => w.balance)).toEqual([50, 50]);
  });

  it('the same credit twice is recorded once', async () => {
    const { s, wallets, txs } = svc();
    await s.processWalletTransaction(credit);
    await s.processWalletTransaction(credit);
    expect(txs).toHaveLength(1);
    expect(wallets[0].balance).toBe(50);
  });

  it('a debit beyond the balance is refused with the same error as before', async () => {
    const { s } = svc();
    await s.processWalletTransaction(credit);
    await expect(s.processWalletTransaction({ ...credit, type: 'debit', amount: 80, referenceId: 'b1' })).rejects.toThrow(BadRequestException);
  });
});
