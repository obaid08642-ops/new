import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { checkOrder, OrderContext } from './ledger-invariants';
import { reconcileDay } from './moyasar-reconcile';
import { FinanceIntegrityService } from './finance-integrity.service';

jest.setTimeout(120_000);
const codes = (c: OrderContext) => checkOrder(c).map((f) => f.code).sort();

// A 100.00 SAR card order: provider net 70, commission 20, VAT on commission 3, (7 platform fee outside the earning).
const earning = { id: 'e1', type: 'provider_earning', amount: 70, gross: 90, commission: 20, vat: 3, ref_id: 'o1', order_id: 'o1' };
const pay = (over: any = {}) => ({ kind: 'transaction' as const, id: 't1', amount: 100, refunded_amount: 0, status: 'paid', method: 'card', ...over });
const base = (over: Partial<OrderContext> = {}): OrderContext => ({ order_id: 'o1', ledger: [earning], earnings: [earning], payments: [pay()], ...over });
const half = [
  { type: 'refund', amount: 50, ref_type: 'refund', ref_id: 'r1', order_id: 'o1', meta: { method: 'gateway' } },
  { type: 'provider_debit', amount: 35, ref_type: 'refund', ref_id: 'r1', order_id: 'o1' },
  { type: 'commission_reversal', amount: 10, ref_type: 'refund', ref_id: 'r1', order_id: 'o1' },
  { type: 'vat_reversal', amount: 1.5, ref_type: 'refund', ref_id: 'r1', order_id: 'o1' },
] as any[];

describe('ledger invariants (pure)', () => {
  it('a paid, unrefunded order and a correctly half-refunded one have no findings', () => {
    expect(codes(base())).toEqual([]);
    expect(codes(base({ ledger: [earning, ...half], payments: [pay({ refunded_amount: 50, status: 'partially_refunded' })] }))).toEqual([]);
  });
  it('cash orders (no payment row) are not compared with a payment', () => {
    expect(codes(base({ payments: [], ledger: [earning, ...half] }))).toEqual([]);
  });
  it('refund above what was paid', () => {
    const big = { ...half[0], amount: 120 };
    expect(codes(base({ ledger: [earning, big], payments: [pay({ refunded_amount: 120 })] }))).toContain('refund_exceeds_paid');
  });
  it('ledger refund that the payment record does not show (and the reverse)', () => {
    expect(codes(base({ ledger: [earning, ...half], payments: [pay({ refunded_amount: 0 })] }))).toContain('refund_ledger_vs_payment');
    expect(codes(base({ ledger: [earning], payments: [pay({ refunded_amount: 50 })] }))).toContain('refund_ledger_vs_payment');
  });
  it('clawback that is not proportional to the refunded share (provider debited 70 for a 50 % refund)', () => {
    const wrong = half.map((r) => (r.type === 'provider_debit' ? { ...r, amount: 70 } : r));
    expect(codes(base({ ledger: [earning, ...wrong], payments: [pay({ refunded_amount: 50 })] }))).toContain('clawback_not_proportional');
  });
  it('a clawback or reversal larger than the earning it reverses', () => {
    const over = half.map((r) => (r.type === 'provider_debit' ? { ...r, amount: 80 } : r.type === 'commission_reversal' ? { ...r, amount: 25 } : r));
    const c = codes(base({ ledger: [earning, ...over], payments: [pay({ refunded_amount: 50 })] }));
    expect(c).toEqual(expect.arrayContaining(['clawback_exceeds_earning', 'commission_reversal_exceeds']));
  });
  it('the same refund recorded twice', () => {
    expect(codes(base({ ledger: [earning, ...half, half[0]], payments: [pay({ refunded_amount: 100 })] }))).toContain('ledger_duplicate_row');
  });
  it('float drift and negative amounts', () => {
    expect(codes(base({ ledger: [{ ...earning, amount: 0.1 + 0.2 }], earnings: [{ ...earning, amount: 0.1 + 0.2 }] }))).toContain('ledger_amount_unclean');
    expect(codes(base({ ledger: [{ ...earning, vat: -1 }] }))).toContain('ledger_amount_unclean');
  });
  it('one halala of rounding per refund is tolerated: 3 refunds of 33.33 on 100.00', () => {
    const refunds = ['r1', 'r2', 'r3'].flatMap((id) => [
      { type: 'refund', amount: 33.33, ref_type: 'refund', ref_id: id, meta: { method: 'gateway' } },
      { type: 'provider_debit', amount: 23.33, ref_type: 'refund', ref_id: id },
      { type: 'commission_reversal', amount: 6.67, ref_type: 'refund', ref_id: id },
      { type: 'vat_reversal', amount: 1, ref_type: 'refund', ref_id: id },
    ]) as any[];
    const c = codes(base({ ledger: [earning, ...refunds], payments: [pay({ refunded_amount: 99.99, status: 'partially_refunded' })] }));
    expect(c).not.toContain('clawback_not_proportional');
  });
});

describe('Moyasar day reconciliation (pure)', () => {
  const local = (over: any = {}) => ({ source: 'transactions' as const, id: 't1', gateway_ids: ['pay_1'], status: 'paid', amount: 100, refunded_amount: 0, ...over });
  const gw = (over: any = {}) => ({ id: 'pay_1', status: 'paid', amount: 10000, refunded: 0, ...over });
  it('matching records have no findings; halalas vs SAR compare exactly', () => {
    expect(reconcileDay([gw()], [local()])).toEqual([]);
    expect(reconcileDay([gw({ amount: 1999 })], [local({ amount: 19.99 })])).toEqual([]);
  });
  it.each([
    ['paid at the gateway, unknown here', [gw({ id: 'pay_x' })], [], 'gateway_paid_not_recorded'],
    ['paid here, unknown at the gateway', [], [local()], 'recorded_paid_not_at_gateway'],
    ['status differs', [gw({ status: 'failed' })], [local()], 'status_mismatch'],
    ['amount differs by one halala', [gw({ amount: 10001 })], [local()], 'amount_mismatch'],
    ['refund differs', [gw({ refunded: 2500, status: 'refunded' })], [local({ status: 'partially_refunded', refunded_amount: 20 })], 'refund_mismatch'],
  ])('%s', (_n, g, l, code) => {
    expect(reconcileDay(g as any, l as any).map((f) => f.code)).toContain(code);
  });
  it('a failed gateway payment unknown here is not a finding', () => {
    expect(reconcileDay([gw({ id: 'pay_f', status: 'failed' })], [])).toEqual([]);
  });
});

describe('FinanceIntegrityService (real MongoDB)', () => {
  let mongod: MongoMemoryServer; let conn: Connection; let svc: FinanceIntegrityService;
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri()).asPromise(); svc = new FinanceIntegrityService(conn as any); });
  afterAll(async () => { await conn.close(); await mongod.stop(); });
  beforeEach(async () => { for (const c of ['platformledgerentries', 'transactions', 'moyasar_payments', 'finance_integrity_runs', 'finance_integrity_findings']) await conn.collection(c).deleteMany({}); });

  const seedBroken = async () => {
    await conn.collection('transactions').insertOne({ id: 't1', booking_id: 'o1', booking_kind: 'lab', amount: 100, refunded_amount: 0, status: 'paid', method: 'card', gateway: 'moyasar', gateway_charge_id: 'pay_1', createdAt: new Date(), paid_at: new Date() } as any);
    await conn.collection('platformledgerentries').insertMany([
      { ...earning, createdAt: new Date() },
      { type: 'refund', amount: 150, ref_type: 'refund', ref_id: 'r1', order_id: 'o1', meta: { method: 'gateway' }, createdAt: new Date() },
    ] as any[]);
  };

  it('stores findings once, runs once per day however many workers ask, and a clean ledger stores nothing', async () => {
    await seedBroken();
    const day = new Date('2026-11-02T00:00:00Z');
    const results = await Promise.all([svc.runLedgerCheck(new Date(0), day), svc.runLedgerCheck(new Date(0), day), svc.runLedgerCheck(new Date(0), day)]);
    expect(results.filter((r) => r !== null)).toHaveLength(1);
    const open = await svc.openFindings();
    expect(open.map((f: any) => f.code)).toEqual(expect.arrayContaining(['refund_exceeds_paid']));
    const n = open.length;
    await svc.runLedgerCheck(new Date(0), day, true);              // forced rerun: same findings, no duplicates
    expect((await svc.openFindings()).length).toBe(n);
    await conn.collection('platformledgerentries').deleteMany({}); await conn.collection('transactions').deleteMany({}); await conn.collection('finance_integrity_findings').deleteMany({});
    await conn.collection('platformledgerentries').insertOne({ ...earning, createdAt: new Date() } as any);
    expect(await svc.runLedgerCheck(new Date(0), new Date('2026-11-03T00:00:00Z'))).toEqual({ checked: 1, findings: 0 });
    expect(await svc.openFindings()).toEqual([]);
  });

  it('Moyasar reconciliation pages through the gateway list and compares with our records', async () => {
    const from = new Date('2026-11-01T00:00:00Z'); const to = new Date('2026-11-02T00:00:00Z');
    await conn.collection('transactions').insertMany([
      { id: 't1', gateway: 'moyasar', gateway_charge_id: 'pay_1', status: 'paid', amount: 100, refunded_amount: 0, createdAt: new Date('2026-11-01T10:00:00Z'), paid_at: new Date('2026-11-01T10:01:00Z') },
      { id: 't2', gateway: 'moyasar', gateway_charge_id: 'sandbox_9', status: 'paid', amount: 5, createdAt: new Date('2026-11-01T11:00:00Z') },   // sandbox: never at the gateway, ignored
    ] as any[]);
    const pages: Record<number, any> = {
      1: { payments: [{ id: 'pay_1', status: 'paid', amount: 10000, refunded: 0 }], next_page: 2 },
      2: { payments: [{ id: 'pay_2', status: 'paid', amount: 2500, refunded: 0 }], next_page: null },
    };
    const calls: number[] = [];
    const r = await svc.runMoyasarReconcile(from, to, async (p) => { calls.push(p); return pages[p]; });
    expect(calls).toEqual([1, 2]);
    expect(r).toEqual({ checked: 2, findings: 1 });
    expect((await svc.openFindings()).map((f: any) => `${f.code}:${f.entity_id}`)).toEqual(['gateway_paid_not_recorded:pay_2']);
    expect(await svc.runMoyasarReconcile(from, to, async () => ({ payments: [], next_page: null }))).toBeNull();   // the day was already claimed
  });
});
