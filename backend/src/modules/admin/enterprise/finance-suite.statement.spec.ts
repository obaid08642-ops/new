/** The provider statement's totals cover every ledger entry, not only the 300 rows it lists. */
import { FinanceSuiteService } from './finance-suite.service';

function build(entries: any[]) {
  const matches = (e: any, q: any) => Object.entries(q).every(([k, v]: [string, any]) => (v && typeof v === 'object' && !(v instanceof Date) ? true : e[k] === v));
  const cursor = (list: any[]) => ({ sort: () => cursor(list), limit: (n: number) => cursor(list.slice(0, n)), project: () => cursor(list), toArray: async () => list });
  const ledger = {
    find: (q: any) => cursor(entries.filter((e) => matches(e, q))),
    aggregate: (stages: any[]) => {
      const rows = entries.filter((e) => matches(e, stages[0].$match));
      const groups = new Map<string, any>();
      for (const e of rows) {
        const key = `${e.type}|${e.state}`;
        const g = groups.get(key) ?? { _id: { type: e.type, state: e.state }, amount: 0 };
        g.amount += e.amount; groups.set(key, g);
      }
      return { toArray: async () => [...groups.values()] };
    },
  };
  const conn: any = { collection: (n: string) => (n === 'platformledgerentries' ? ledger : { find: () => cursor([]) }) };
  return new (FinanceSuiteService as any)(conn, { write: jest.fn() });
}

describe('FinanceSuiteService.providerStatement', () => {
  it('totals and balance cover all entries, while only the newest 300 rows are listed', async () => {
    const entries: any[] = [];
    for (let i = 0; i < 350; i++) entries.push({ id: `e${i}`, provider_account_id: 'p1', type: 'provider_earning', state: 'cleared', amount: 10 });
    entries.push({ id: 'pay', provider_account_id: 'p1', type: 'payout', state: 'cleared', amount: 100 });
    entries.push({ id: 'res', provider_account_id: 'p1', type: 'payout', state: 'locked', amount: 200 });
    entries.push({ id: 'pend', provider_account_id: 'p1', type: 'provider_earning', state: 'pending', amount: 40 });
    entries.push({ id: 'deb', provider_account_id: 'p1', type: 'provider_debit', state: 'cleared', amount: 50 });
    entries.push({ id: 'other', provider_account_id: 'p2', type: 'provider_earning', state: 'cleared', amount: 999 });
    const out = await build(entries).providerStatement('p1');
    expect(out.ledger).toHaveLength(300);
    expect(out.summary).toEqual({ earned_cleared: 3500, earned_pending: 40, paid_out: 100, debits: 50, locked: 200 });
    // 3500 earned - 100 paid - 50 debited - 200 held for an open withdrawal
    expect(out.balance_available).toBe(3150);
  });

  it('a provider with no entries has a zero statement', async () => {
    const out = await build([]).providerStatement('p9');
    expect(out.balance_available).toBe(0);
    expect(out.summary.earned_cleared).toBe(0);
  });
});
