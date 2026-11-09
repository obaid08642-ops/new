import { ProviderOpsService } from './provider-ops.module';
import { clampMonths, foldRevenue, monthKey, monthKeys, rangeStart, revenuePipeline } from './revenue-by-month';

const NOW = new Date('2026-11-09T10:00:00Z');                      // 13:00 on 9 November in Riyadh

describe('months in Riyadh time', () => {
  it('the last 12 month keys end with the current month, oldest first', () => {
    const k = monthKeys(NOW, 12);
    expect(k).toHaveLength(12);
    expect(k[0]).toBe('2025-12');
    expect(k[11]).toBe('2026-11');
  });

  it('a moment before midnight UTC on the last day is already the next month in Riyadh', () => {
    expect(monthKey(new Date('2026-10-31T20:59:59Z'))).toBe('2026-10');
    expect(monthKey(new Date('2026-10-31T21:00:00Z'))).toBe('2026-11');   // 00:00 on 1 November in Riyadh
  });

  it('the range starts at midnight of the first day of the oldest month, Riyadh time', () => {
    expect(rangeStart(NOW, 12).toISOString()).toBe('2025-11-30T21:00:00.000Z');   // 12 months ending in November 2026 start on 1 December 2025, 00:00 Riyadh
  });

  it('the number of months is clamped (default 12, at most 24)', () => {
    expect([undefined, 'x', '0', '-3', '7', '7.9', '99'].map(clampMonths)).toEqual([12, 12, 12, 12, 7, 7, 24]);
  });
});

describe('foldRevenue', () => {
  const rows = [
    { _id: { m: '2026-11', t: 'provider_earning' }, total: 30050 },     // 300.50
    { _id: { m: '2026-11', t: 'provider_debit' }, total: 5025 },        // refunds 50.25
    { _id: { m: '2026-10', t: 'provider_earning' }, total: 10000 },
    { _id: { m: '2024-01', t: 'provider_earning' }, total: 99999 },     // outside the range: ignored
  ];

  it('one row per month with zeros where nothing happened; refunds are netted', () => {
    const out = foldRevenue(rows, NOW, 12);
    expect(out.months).toHaveLength(12);
    expect(out.months[11]).toEqual({ month: '2026-11', earned: 300.5, refunded: 50.25, net: 250.25 });
    expect(out.months[10]).toEqual({ month: '2026-10', earned: 100, refunded: 0, net: 100 });
    expect(out.months[0]).toEqual({ month: '2025-12', earned: 0, refunded: 0, net: 0 });
    expect(out.total).toEqual({ earned: 400.5, refunded: 50.25, net: 350.25 });
  });

  it('whole halalas are added, so 0.1 + 0.2 does not drift', () => {
    const out = foldRevenue([{ _id: { m: '2026-11', t: 'provider_earning' }, total: 10 + 20 }], NOW, 1);
    expect(out.months[0].earned).toBe(0.3);
  });

  it('a refund bigger than the month\'s earnings makes the month negative (it is a clawback booked that month)', () => {
    const out = foldRevenue([{ _id: { m: '2026-11', t: 'provider_earning' }, total: 1000 }, { _id: { m: '2026-11', t: 'provider_debit' }, total: 2500 }], NOW, 1);
    expect(out.months[0].net).toBe(-15);
  });
});

describe('the pipeline and the service', () => {
  it('matches only this provider\'s earnings and refund clawbacks, grouped by Riyadh month and type, adding halalas', () => {
    const [match, group]: any[] = revenuePipeline(['acc-1', 'user-1'], new Date('2025-11-30T21:00:00Z'));
    expect(match.$match.provider_account_id).toEqual({ $in: ['acc-1', 'user-1'] });
    expect(match.$match.$or).toEqual([{ type: 'provider_earning' }, { type: 'provider_debit', ref_type: 'refund' }]);
    expect(group.$group._id.m.$dateToString).toMatchObject({ format: '%Y-%m', timezone: 'Asia/Riyadh' });
    expect(JSON.stringify(group.$group.total)).toContain('amount_halalas');
  });

  it('revenueByMonth reads both ids of the provider and answers 12 months by default', async () => {
    const aggregate: jest.Mock = jest.fn((_pipeline: any[]) => ({ toArray: async () => [{ _id: { m: monthKey(new Date()), t: 'provider_earning' }, total: 12345 }] }));
    const conn: any = { collection: jest.fn((n: string) => (n === 'provider_accounts' ? { findOne: jest.fn().mockResolvedValue({ id: 'acc-1', user_id: 'user-1' }) } : { aggregate })) };
    const out = await new ProviderOpsService(conn).revenueByMonth('user-1');
    expect(aggregate.mock.calls[0][0][0].$match.provider_account_id).toEqual({ $in: ['user-1', 'acc-1'] });
    expect(out.months).toHaveLength(12);
    expect(out.months[11].earned).toBe(123.45);
    expect((await new ProviderOpsService(conn).revenueByMonth('user-1', '3')).months).toHaveLength(3);
  });
});
