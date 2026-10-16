import { ProviderOpsService } from './provider-ops.module';

// 300 earnings of 10 SAR today: more than the 200 rows walletLedger ever returns.
function ledgerRows(n: number, now: Date) {
  return Array.from({ length: n }, (_, i) => ({ id: `le_${i}`, type: 'provider_earning', amount: 10, createdAt: new Date(now.getTime() - i * 1000), provider_account_id: 'prov-1' }));
}

function service(rows: any[]) {
  // find() honours .sort().limit(n) like Mongo does; a plain find().toArray() returns every matching row
  const ledger = {
    find: jest.fn((filter: any) => {
      const matching = rows.filter((r) => r.provider_account_id === filter.provider_account_id
        && (!filter.type || r.type === filter.type)
        && (!filter.createdAt || r.createdAt >= filter.createdAt.$gte));
      let lim = 0;
      const chain: any = { sort: () => chain, limit: (n: number) => { lim = n; return chain; }, project: () => chain, toArray: async () => (lim ? matching.slice(0, lim) : matching) };
      return chain;
    }),
  };
  const empty: any = { countDocuments: async () => 0, find: () => { const c: any = { project: () => c, sort: () => c, limit: () => c, next: async () => null, toArray: async () => [] }; return c; } };
  const conn = { collection: (name: string) => (name === 'platformledgerentries' ? ledger : empty) };
  return new ProviderOpsService(conn as never);
}

describe('provider revenue stats read every earning, not the newest 200 ledger rows', () => {
  it('statsToday sums all 300 earnings of today', async () => {
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const rows = ledgerRows(300, now).filter((r) => r.createdAt >= dayStart);
    const out = await service(rows).statsToday('prov-1');
    expect(out.revenue).toBe(rows.length * 10);
  });

  it('statsPeriod(year) sums all 300 earnings of the year', async () => {
    const rows = ledgerRows(300, new Date());
    const out = await service(rows).statsPeriod('prov-1', 'year');
    expect(out.revenue).toBe(3000);
  });
});
