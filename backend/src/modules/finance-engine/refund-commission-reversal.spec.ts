import { RefundExecutor, ReportsService } from './finance-engine.module';
import { refundGuardCollections } from './refund-guard.fake';

/**
 * A refund of a service whose earning was credited: the patient gets R back; the provider's net, the platform's commission and the VAT on
 * it are taken back in the same proportion (net share + commission share + VAT share = R), so a refunded order earns the platform nothing.
 */
function world(earning: any, paidAmount = 200) {
  const rows: any[] = [];
  const ledger = {
    exists: jest.fn(async (type: string, _rt: string, id: string) => rows.find((r) => r.type === type && r.ref_id === id) ?? null),
    append: jest.fn(async (r: any) => { rows.push(r); return r; }),
  };
  const guard = refundGuardCollections();
  const cols: Record<string, any> = {
    refund_reservations: guard.refund_reservations, refund_totals: guard.refund_totals,
    moyasar_payments: { findOne: async () => null },
    transactions: { findOne: async () => ({ id: 't1', status: 'paid', method: 'cash', amount: paidAmount }) },
    appointments: { findOne: async () => ({ id: 'a1', patient_id: 'p1', payment_method: 'cash', payment_status: 'paid', total_price: paidAmount }), updateOne: async () => ({ matchedCount: 1 }) },
    platformledgerentries: { findOne: async () => earning },
    notifications: { insertOne: async () => ({}) },
  };
  const exec = new RefundExecutor({ collection: (n: string) => cols[n] ?? {} } as any, ledger as any, {} as any, { emit: jest.fn() } as any);
  return { exec, rows };
}
// 200 SAR consultation at 15% commission: commission 30, VAT on it 4.50, the doctor's net 165.50
const earning = { id: 'e1', provider_account_id: 'doc1', type: 'provider_earning', gross: 200, commission: 30, vat: 4.5, amount: 165.5 };
const go = (exec: RefundExecutor, amount: number, id = 'r1') => exec.execute({ refund_id: id, booking_kind: 'consultation', booking_id: 'a1', patient_id: 'p1', amount, reason: 'dispute', actor_id: 'admin' });

describe('refund of a credited earning', () => {
  it('a full refund: the provider net, the commission and the VAT on it all come back; the three add up to the refund', async () => {
    const { exec, rows } = world(earning);
    await go(exec, 200);
    const by = (t: string) => rows.filter((r) => r.type === t);
    expect(by('provider_debit')).toEqual([expect.objectContaining({ provider_account_id: 'doc1', amount: 165.5 })]);
    expect(by('commission_reversal')).toEqual([expect.objectContaining({ amount: 30, provider_account_id: null })]);
    expect(by('vat_reversal')).toEqual([expect.objectContaining({ amount: 4.5, provider_account_id: null })]);
    expect(165.5 + 30 + 4.5).toBe(200);
  });
  it('a half refund reverses half of each', async () => {
    const { exec, rows } = world(earning);
    await go(exec, 100);
    expect(rows.find((r) => r.type === 'provider_debit').amount).toBe(82.75);
    expect(rows.find((r) => r.type === 'commission_reversal').amount).toBe(15);
    expect(rows.find((r) => r.type === 'vat_reversal').amount).toBe(2.25);
  });
  it('the patient also paid platform fees (paid 150, the provider\'s own gross 100): half of the payment refunded takes back half of each share, not all of them', async () => {
    const { exec, rows } = world({ ...earning, gross: 100, commission: 15, vat: 2.25, amount: 82.75 }, 150);
    await go(exec, 75);
    expect(rows.find((r) => r.type === 'provider_debit').amount).toBe(41.38); // 82.75 x 75/150
    expect(rows.find((r) => r.type === 'commission_reversal').amount).toBe(7.5);
    expect(rows.find((r) => r.type === 'vat_reversal').amount).toBe(1.13);
  });
  it('a repeat of the same refund id writes nothing twice', async () => {
    const { exec, rows } = world(earning);
    await go(exec, 100);
    const n = rows.length;
    await go(exec, 100);
    expect(rows.length).toBe(n);
  });
  it('a 0% commission (a promo) has nothing to reverse: only the provider debit', async () => {
    const { exec, rows } = world({ ...earning, commission: 0, vat: 0, amount: 200 });
    await go(exec, 200);
    expect(rows.map((r) => r.type).sort()).toEqual(['provider_debit', 'refund']);
  });
  it('a booking with no credited earning (cancelled before the service): no reversal, nothing to claw back', async () => {
    const { exec, rows } = world(null);
    await go(exec, 200);
    expect(rows.map((r) => r.type)).toEqual(['refund']);
  });
});

describe('the finance report', () => {
  it('commission and the VAT on it are net of what refunds reversed', async () => {
    const agg = (rows: any[]) => ({ aggregate: () => ({ toArray: async () => rows }) });
    const cols: Record<string, any> = {
      moyasar_payments: agg([]),
      refundrequests: agg([]),
      orders: { countDocuments: async () => 0 },
      pharmacy_orders: { countDocuments: async () => 0 },
      platformledgerentries: {
        aggregate: (pipe: any[]) => ({
          toArray: async () => (pipe.some((p) => p.$match?.type === 'provider_earning')
            ? [{ _id: null, commission: 30, vat: 4.5, gross: 200, net: 165.5 }]
            : [{ _id: { type: 'commission_reversal', state: 'cleared' }, total: 30, count: 1 }, { _id: { type: 'vat_reversal', state: 'cleared' }, total: 4.5, count: 1 }]),
        }),
      },
    };
    const report = await new ReportsService({ collection: (n: string) => cols[n] } as any).summary('monthly');
    expect(report).toMatchObject({ commission: 0, vat_on_commission: 0, net_revenue: 0 });
  });
});
