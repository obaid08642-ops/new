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

describe('gap 7: consultations come from the appointments and the rating from `score`', () => {
  const day = new Date();
  function withData(data: Record<string, any[]>) {
    const make = (rows: any[]) => ({
      find: (f: any) => {
        const ors: Array<Record<string, unknown>> = f.$or || [];
        let m = rows.filter((r) => ors.some((c) => Object.entries(c).every(([k, v]) => r[k] === v)));
        if (f.status) m = m.filter((r) => r.status === f.status);
        const chain: any = { sort: () => chain, limit: () => chain, project: () => chain, next: async () => m[0] ?? null, toArray: async () => m };
        return chain;
      },
      countDocuments: async () => 0,
    });
    const conn = { collection: (n: string) => make(data[n] ?? []) };
    return new ProviderOpsService(conn as never);
  }

  it('counts the doctor\'s appointments (found by the doctor\'s account id) and their patients', async () => {
    const out = await withData({ appointments: [
      { id: 'a1', doctor_id: 'profile-1', doctor_user_id: 'prov-1', patient_id: 'p1', createdAt: day },
      { id: 'a2', doctor_id: 'profile-1', doctor_user_id: 'prov-1', patient_id: 'p2', createdAt: day },
      { id: 'a3', doctor_id: 'profile-9', doctor_user_id: 'other', patient_id: 'p3', createdAt: day },
    ] }).statsPeriod('prov-1', 'month');
    expect(out.appointments).toBe(2);
    expect(out.service_breakdown).toEqual([{ label: 'consultation', count: 2, pct: 100 }]);
    expect(out.new_patients).toBe(2);
  });

  it('the rating is the average of the published `score` values; unpublished ones and old field names do not hide it', async () => {
    const out = await withData({ ratings: [
      { provider_id: 'prov-1', status: 'published', score: 5, createdAt: day },
      { provider_id: 'prov-1', status: 'published', score: 4, createdAt: day },
      { provider_id: 'prov-1', status: 'pending', score: 1, createdAt: day },
      { provider_id: 'prov-1', status: 'published', rating: 3, createdAt: day },
    ] }).statsPeriod('prov-1', 'month');
    expect(out.ratings_count).toBe(3);
    expect(out.rating).toBe(4);
  });

  it('no ratings: no rating, not zero', async () => {
    const out = await withData({}).statsPeriod('prov-1', 'month');
    expect(out.rating).toBeNull();
    expect(out.ratings_count).toBe(0);
  });
});
