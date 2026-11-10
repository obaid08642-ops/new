import { LedgerService } from './finance-engine.module';

// Escrow maturity: an earning turns from pending to cleared once its hold (available_at) has passed. It used to happen only when somebody asked for that provider's balance.
describe('LedgerService.matureAllDueEscrow', () => {
  const NOW = new Date('2026-11-10T12:00:00Z');
  function ledger(rows: any[]) {
    const col = {
      updateMany: jest.fn(async (q: any, u: any) => {
        let n = 0;
        for (const r of rows) {
          if (r.type === q.type && r.state === q.state && r.available_at <= q.available_at.$lte && (q.provider_account_id === undefined || r.provider_account_id === q.provider_account_id)) { Object.assign(r, u.$set); n += 1; }
        }
        return { modifiedCount: n };
      }),
    };
    return { svc: new LedgerService({ collection: () => col } as any), col };
  }
  const rows = () => [
    { id: 'a', provider_account_id: 'p1', type: 'provider_earning', state: 'pending', available_at: new Date('2026-11-10T09:00:00Z') },   // due
    { id: 'b', provider_account_id: 'p2', type: 'provider_earning', state: 'pending', available_at: new Date('2026-11-10T11:59:00Z') },   // due
    { id: 'c', provider_account_id: 'p1', type: 'provider_earning', state: 'pending', available_at: new Date('2026-11-12T09:00:00Z') },   // not yet
    { id: 'd', provider_account_id: 'p1', type: 'payout', state: 'pending', available_at: new Date('2026-11-10T09:00:00Z') },             // not an earning
    { id: 'e', provider_account_id: 'p1', type: 'provider_earning', state: 'cleared', available_at: new Date('2026-11-01T09:00:00Z') },   // already cleared
  ];

  it('clears the due earnings of every provider at once; not-yet-due rows, other types and cleared rows are untouched', async () => {
    const data = rows();
    const { svc } = ledger(data);
    expect(await svc.matureAllDueEscrow(NOW)).toBe(2);
    expect(data.map((r) => [r.id, r.state])).toEqual([['a', 'cleared'], ['b', 'cleared'], ['c', 'pending'], ['d', 'pending'], ['e', 'cleared']]);
    expect(data[0]).toMatchObject({ matured_at: NOW });
  });
  it('is idempotent: a second run changes nothing', async () => {
    const data = rows();
    const { svc } = ledger(data);
    await svc.matureAllDueEscrow(NOW);
    expect(await svc.matureAllDueEscrow(NOW)).toBe(0);
  });
  it('the per-provider call still works the same', async () => {
    const data = rows();
    const { svc } = ledger(data);
    jest.useFakeTimers({ now: NOW });
    try { await svc.matureEscrow('p2'); } finally { jest.useRealTimers(); }
    expect(data.find((r) => r.id === 'b')!.state).toBe('cleared');
    expect(data.find((r) => r.id === 'a')!.state).toBe('pending');   // another provider: untouched
  });

  it('the maturity update has a small partial index (pending earnings only), created once per process, so it never reads the whole ledger; a failing index build never stops the job', async () => {
    const data = rows();
    const { svc, col } = ledger(data);
    (col as any).createIndex = jest.fn(async () => 'ok');
    await svc.matureAllDueEscrow(NOW);
    await svc.matureAllDueEscrow(NOW);
    expect((col as any).createIndex).toHaveBeenCalledTimes(1);
    expect((col as any).createIndex).toHaveBeenCalledWith({ available_at: 1 }, { name: 'ledger_pending_earning_due', partialFilterExpression: { type: 'provider_earning', state: 'pending' } });
    const broken = ledger(rows());
    (broken.col as any).createIndex = jest.fn(async () => { throw new Error('not authorized'); });
    expect(await broken.svc.matureAllDueEscrow(NOW)).toBe(2);
  });
});

