/** Money step M3: the payment collections carry `<field>_minor` + `currency` next to the legacy amounts; SAR rows are identical to the halala shadows. Real MongoDB, real schemas. */
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TransactionSchema } from '../../schemas/transaction.schema';
import { MoyasarPaymentSchema } from '../moyasar/moyasar.module';
import { EInvoiceSchema } from '../billing/billing.module';
import { RefundRequestSchema as PatientRefundRequestSchema } from '../../schemas/refund-request.schema';
import { RefundRequestSchema as PolicyRefundRequestSchema } from '../insurance-engine/insurance-engine.module';
import { runWithMarketContext } from '../markets/market-context';
import { refundedShadows } from './refund-shadows';

jest.setTimeout(120_000);
const inMarket = <T>(currency: string, fn: () => T) => runWithMarketContext({ currency } as any, fn);

describe('refundedShadows (raw moyasar_payments refund write)', () => {
  it('SAR payment: halalas and minor are the same number, currency SAR', () => {
    expect(refundedShadows('SAR', 10.5)).toEqual({ refunded_amount_halalas: 1050, refunded_amount_minor: 1050, currency: 'SAR' });
  });
  it('a payment with no currency is SAR (every existing row)', () => {
    expect(refundedShadows(undefined, 10.5)).toEqual({ refunded_amount_halalas: 1050, refunded_amount_minor: 1050, currency: 'SAR' });
  });
  it('BHD payment: 3-digit minor from the ROW currency, no halalas; the market of the caller does not matter', () => {
    expect(inMarket('SAR', () => refundedShadows('BHD', 1.234))).toEqual({ refunded_amount_minor: 1234, currency: 'BHD' });
  });
});

describe('payment schemas with minorShadowPlugin', () => {
  let mongo: MongoMemoryServer; let conn: Connection;
  let Txn: Model<any>; let Pay: Model<any>; let Inv: Model<any>; let Ref: Model<any>; let Pol: Model<any>; let n = 0;
  const raw = (coll: string, id: string) => conn.collection(coll).findOne({ id } as any) as Promise<any>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'm3' }).asPromise();
    Txn = conn.model('Transaction', TransactionSchema);
    Pay = conn.model('MoyasarPayment', MoyasarPaymentSchema, 'moyasar_payments');
    Inv = conn.model('EInvoice', EInvoiceSchema);
    Ref = conn.model('RefundRequest', PatientRefundRequestSchema);
    Pol = conn.model('PolicyRefundRequest', PolicyRefundRequestSchema, 'policy_refund_requests');
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  const txn = (over: Record<string, unknown> = {}) => Txn.create({ booking_kind: 'consultation', booking_id: `b${++n}`, patient_id: 'p1', amount: 150.5, status: 'paid', ...over });

  it('SAR transaction (today, no market context): _minor equals _halalas, currency SAR, double untouched', async () => {
    const t = await txn();
    const r = await raw('transactions', t.id);
    expect(r.amount).toBe(150.5);
    expect(r.amount_minor).toBe(15050);
    expect(r.amount_minor).toBe(r.amount_halalas);
    expect(r.currency).toBe('SAR');
  });

  it('a transaction created inside a BHD market takes BHD from the market, 3 digits, no halalas', async () => {
    const t = await inMarket('BHD', () => txn({ amount: 12.345 }));
    const r = await raw('transactions', t.id);
    expect(r.currency).toBe('BHD');
    expect(r.amount_minor).toBe(12345);
    expect(r.amount_halalas).toBeUndefined();
  });

  it('refunding a BHD transaction later, outside any market, keeps BHD (the row decides): refunded_amount_minor in fils', async () => {
    const t = await inMarket('BHD', () => txn({ amount: 12.345 }));
    const doc = await Txn.findOne({ id: t.id });
    doc!.refunded_amount = 2.5; await doc!.save();
    const r = await raw('transactions', t.id);
    expect(r.currency).toBe('BHD');
    expect(r.refunded_amount_minor).toBe(2500);
    expect(r.refunded_amount_halalas).toBeUndefined();
  });

  it('a SAR transaction refunded as before: both shadows move, same value', async () => {
    const t = await txn({ amount: 100 });
    const doc = await Txn.findOne({ id: t.id });
    doc!.refunded_amount = 40.25; await doc!.save();
    const r = await raw('transactions', t.id);
    expect(r.refunded_amount_minor).toBe(4025);
    expect(r.refunded_amount_halalas).toBe(4025);
  });

  it('moyasar payments: SAR row gets _minor = _halalas', async () => {
    const p = await Pay.create({ booking_id: 'b', booking_kind: 'consultation', patient_id: 'p1', amount: 75.5, refunded_amount: 10, moyasar_id: `m${n}`, status: 'paid' });
    const r = await conn.collection('moyasar_payments').findOne({ _id: p._id } as any) as any;
    expect(r.amount_minor).toBe(7550); expect(r.amount_minor).toBe(r.amount_halalas);
    expect(r.refunded_amount_minor).toBe(1000);
    expect(r.currency).toBe('SAR');
  });

  it('e-invoices: subtotal, vat_amount, total, discount all get _minor', async () => {
    const i = await Inv.create({ id: `inv${++n}`, invoice_no: `INV-${n}`, type: 'invoice', booking_kind: 'consultation', booking_id: `bi${n}`, patient_id: 'p1', subtotal: 100, vat_amount: 15, total: 115, discount: 0 });
    const r = await conn.collection('einvoices').findOne({ _id: i._id } as any) as any;
    expect([r.subtotal_minor, r.vat_amount_minor, r.total_minor, r.discount_minor]).toEqual([10000, 1500, 11500, 0]);
    expect(r.currency).toBe('SAR');
  });

  it('refund requests (patient and policy schemas) get _minor and a currency', async () => {
    const a = await Ref.create({ id: `rr${++n}`, patient_id: 'p1', booking_kind: 'consultation', booking_id: 'b', amount: 33.3, reason: 'test', state: 'REQUESTED' } as any);
    const ra = await conn.collection('refundrequests').findOne({ _id: a._id } as any) as any;
    expect(ra.amount_minor).toBe(3330); expect(ra.amount_minor).toBe(ra.amount_halalas); expect(ra.currency).toBe('SAR');
    const b = await Pol.create({ id: `pr${++n}`, booking_id: 'b', patient_id: 'p1', refund_percent: 25, amount_paid: 200, refund_amount: 50.5 } as any);
    const rb = await conn.collection('policy_refund_requests').findOne({ _id: b._id } as any) as any;
    expect(rb.amount_paid_minor).toBe(20000); expect(rb.refund_amount_minor).toBe(5050);
  });

  it('toJSON of a transaction shows no *_minor field (clients read the doubles until they move)', async () => {
    const t = await txn({ amount: 20 });
    const j: any = (await Txn.findOne({ id: t.id }))!.toJSON();
    expect(j.amount).toBe(20);
    expect(Object.keys(j).filter((k) => k.endsWith('_minor'))).toEqual([]);
  });
});
