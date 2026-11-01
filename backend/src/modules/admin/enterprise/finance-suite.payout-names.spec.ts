import { FinanceSuiteService } from './finance-suite.service';

const build = (withdrawals: any[], accounts: any[], profiles: any[]) => {
  const find = (rows: any[]) => ({
    sort: () => ({ skip: () => ({ limit: () => ({ project: () => ({ toArray: async () => rows }) }) }) }),
    project: () => ({ toArray: async () => rows }),
  });
  const conn: any = {
    collection: (n: string) => n === 'providerwithdrawals'
      ? { find: () => find(withdrawals), countDocuments: async () => withdrawals.length, aggregate: () => ({ toArray: async () => [] }) }
      : n === 'provider_accounts' ? { find: () => find(accounts) }
      : n === 'provider_profiles' ? { find: () => find(profiles) }
      : n === 'finance_config' ? { findOne: async () => null }
      : {},
  };
  return new (FinanceSuiteService as any)(conn, { write: jest.fn() });
};

describe('payout queue shows who is being paid', () => {
  it('uses the account name, else the profile name, else null', async () => {
    const svc = build(
      [{ id: 'w1', provider_id: 'acc-1', amount: 10 }, { id: 'w2', provider_id: 'acc-2', amount: 20 }, { id: 'w3', provider_id: 'acc-3', amount: 30 }],
      [{ id: 'acc-1', full_name: 'Dr Sara' }],
      [{ account_id: 'acc-2', display_name: 'عيادة النور' }],
    );
    const res = await svc.payoutQueue();
    expect(res.data.map((w: any) => w.provider_name)).toEqual(['Dr Sara', 'عيادة النور', null]);
  });
  it('an empty queue makes no name lookups', async () => {
    const res = await build([], [], []).payoutQueue();
    expect(res.data).toEqual([]);
  });
});
