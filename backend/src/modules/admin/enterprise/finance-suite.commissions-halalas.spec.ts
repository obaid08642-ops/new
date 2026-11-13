import { FinanceSuiteService } from './finance-suite.service';

function service(payments: any[], cfg: any = { service_types: { lab: { percent: 10 }, doctor: { percent: 20 } }, tax: { vat_percent: 15 } }) {
  const conn: any = {
    collection: (name: string) => name === 'finance_config'
      ? { findOne: async () => cfg, updateOne: async () => ({}) }
      : { find: () => ({ project: () => ({ toArray: async () => payments }) }) },
  };
  return new FinanceSuiteService(conn, { write: async () => undefined } as any);
}
const range = { from: '2026-11-01', to: '2026-11-30' };

describe('commission report on integer halalas (R11 P2 read path)', () => {
  it('commission and VAT are rounded on integer halalas per payment, then added', async () => {
    // 10.01 SAR at 10 % = 100.1 halalas -> 100; VAT 15 % of 100 = 15
    const r: any = await service([{ amount_halalas: 1001, booking_kind: 'lab' }, { amount_halalas: 1001, booking_kind: 'lab' }]).commissions(range);
    expect(r.by_vertical.lab).toEqual({ gross: 20.02, commission: 2, vat: 0.3, net_to_provider: 18.02, count: 2 });
    expect(r.totals.gross).toBe(20.02);
  });
  it('falls back to the double for a payment without a shadow', async () => {
    const r: any = await service([{ amount: 0.1, booking_kind: 'lab' }, { amount: 0.2, booking_kind: 'lab' }]).commissions(range);
    expect(r.by_vertical.lab.gross).toBe(0.3);
    expect(r.by_vertical.lab.count).toBe(2);
  });
  it('uses each vertical its own percent and sums the totals', async () => {
    const r: any = await service([{ amount_halalas: 10000, booking_kind: 'lab' }, { amount_halalas: 10000, booking_kind: 'consultation' }]).commissions(range);
    expect(r.by_vertical.lab.commission).toBe(10);
    expect(r.by_vertical.consultation.commission).toBe(20);
    expect(r.totals).toMatchObject({ gross: 200, commission: 30, count: 2 });
  });
  it('gross = commission + net to provider for every vertical (no halala lost)', async () => {
    const r: any = await service([{ amount_halalas: 3333, booking_kind: 'lab' }, { amount_halalas: 777, booking_kind: 'lab' }]).commissions(range);
    const v = r.by_vertical.lab;
    expect(Math.round((v.commission + v.net_to_provider) * 100)).toBe(Math.round(v.gross * 100));
  });
  it('no payments in the range: empty by_vertical and zero totals', async () => {
    const r: any = await service([]).commissions(range);
    expect(r.by_vertical).toEqual({});
    expect(r.totals.gross).toBe(0);
  });
});
