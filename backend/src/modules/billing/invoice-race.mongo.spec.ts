import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BillingService, EInvoiceSchema } from './billing.module';
import { INVOICE_KEY_INDEX, countInvoiceDuplicates } from './invoice-key';

/** The payment event and the patient's request issue the invoice of one booking at the same moment, against a real MongoDB: one invoice, every caller gets it. */
jest.setTimeout(120_000);
describe('issue() against a real MongoDB: parallel issuing for one booking', () => {
  let mongod: MongoMemoryServer; let conn: Connection;
  const einvoices = () => conn.collection('einvoices');
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongod.getUri()).asPromise();
    conn.model('EInvoice', EInvoiceSchema);
    conn.model('LabBooking', new mongoose.Schema({}, { strict: false, collection: 'labbookings' }));
  });
  afterAll(async () => { await conn.close(); await mongod.stop(); });
  beforeEach(async () => {
    await einvoices().deleteMany({});
    await conn.collection('labbookings').deleteMany({});
    await conn.collection('transactions').deleteMany({});
    try { await einvoices().dropIndex(INVOICE_KEY_INDEX); } catch { /* none yet */ }
    await conn.collection('labbookings').insertOne({ id: 'b1', patient_id: 'p1', total: 115 });
    await conn.collection('transactions').insertOne({ booking_kind: 'lab', booking_id: 'b1', status: 'paid', amount: 115 });
  });

  it('eight parallel issues of the same paid booking leave exactly one issued invoice, and every caller gets it', async () => {
    const svc = new BillingService(conn);
    const out: any[] = await Promise.all(Array.from({ length: 8 }, (_, i) => (i % 2 ? svc.issue(null, 'lab', 'b1') : svc.issue({ id: 'p1', role: 'patient' }, 'lab', 'b1'))));
    expect(await einvoices().countDocuments({ booking_kind: 'lab', booking_id: 'b1', type: 'invoice', status: 'ISSUED' })).toBe(1);
    expect(new Set(out.map((o) => o.invoice_no)).size).toBe(1);
    expect((await einvoices().indexes()).some((i: any) => i.name === INVOICE_KEY_INDEX && i.unique)).toBe(true);
  });

  it('a credit note of the booking is outside the index (several are allowed)', async () => {
    const svc = new BillingService(conn);
    await svc.issue(null, 'lab', 'b1');
    await einvoices().insertMany([
      { invoice_no: 'CN-2026-000001', type: 'credit_note', status: 'ISSUED', booking_kind: 'lab', booking_id: 'b1', total: -10 },
      { invoice_no: 'CN-2026-000002', type: 'credit_note', status: 'ISSUED', booking_kind: 'lab', booking_id: 'b1', total: -5 },
    ]);
    expect(await einvoices().countDocuments({ booking_id: 'b1' })).toBe(3);
  });

  it('with two issued invoices already on a booking the index is not built, and issuing still works for another booking', async () => {
    await einvoices().insertMany([
      { invoice_no: 'INV-2026-900001', type: 'invoice', status: 'ISSUED', booking_kind: 'lab', booking_id: 'dup', total: 1 },
      { invoice_no: 'INV-2026-900002', type: 'invoice', status: 'ISSUED', booking_kind: 'lab', booking_id: 'dup', total: 1 },
    ]);
    expect(await countInvoiceDuplicates(conn)).toEqual({ groups: 1, extra_rows: 1 });
    const svc = new BillingService(conn);
    const out: any = await svc.issue(null, 'lab', 'b1');
    expect(out.booking_id).toBe('b1');
    expect((await einvoices().indexes()).some((i: any) => i.name === INVOICE_KEY_INDEX)).toBe(false);
  });
});
