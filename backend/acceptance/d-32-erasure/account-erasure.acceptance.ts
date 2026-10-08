// ACCEPTANCE — D-32 account erasure: anonymise the person, keep invoices and medical records (owner
// instruction 2026-10-08 with decisions 22 and 32). Written by the reviewer before the work; the
// implementing agent makes it pass and may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis. The patient's
// password is generated per run.
//
// The patient erases their own account through the real route, DELETE /api/v1/users/me {password}.
// Required
//   1. Identity is gone everywhere: after erasure, no document in ANY collection still contains the
//      patient's name, phone, email, national id or home street (the profile, bookings, orders, payments,
//      invoices, reviews, notifications... all of them).
//   2. Medical records are kept (the record, without the identity): prescriptions, lab results, medical
//      reports, appointments and lab bookings still exist, with their clinical content.
//   3. Invoices and payments are kept with their amounts: transactions, Moyasar payments, e-invoices,
//      invoices and wallet transactions still exist and still carry the same amount.
//   4. The old credentials no longer sign in.
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const ID = 'pat-erase';
const PASSWORD = randomBytes(12).toString('hex');
const PII = {
  name: 'Nora Erasable',
  phone: '+966500001234',
  email: 'nora.erase@example.test',
  national_id: '1099988877',
  street: '12 Private Street',
};
const PII_VALUES = Object.values(PII);
const now = () => new Date();

const MEDICAL: Array<[string, Record<string, unknown>, string]> = [
  ['prescriptions', { id: 'rx-e', patient_id: ID, patient_name: PII.name, status: 'active', items: [{ name: 'Metformin 500mg' }] }, 'Metformin 500mg'],
  ['labresults', { id: 'lr-e', booking_id: 'lb-e', patient_id: ID, patient_name: PII.name, service_name_ar: 'cbc', type: 'STRUCTURED', source: 'labs', entries: [{ name: 'HGB', value: '13.1' }] }, 'HGB'],
  ['medicalreports', { id: 'mr-e', patient_id: ID, title_ar: 'تقرير', report_type: 'clinic_note', diagnosis: 'Type 2 diabetes' }, 'Type 2 diabetes'],
  ['appointments', { id: 'ap-e', patient_id: ID, patient_name: PII.name, patient_phone: PII.phone, doctor_id: 'doc-1', status: 'COMPLETED', service_type: 'clinic', price: 200, notes: 'follow-up in 3 months' }, 'follow-up in 3 months'],
  ['labbookings', { id: 'lb-e', tracking_id: 'LB-E', patient_id: ID, patient_name: PII.name, patient_phone: PII.phone, state: 'REPORTED', items: [{ service_id: 'cbc', name_en: 'CBC', price: 80 }], total: 80, scheduled_at: now() }, 'CBC'],
];
const MONEY: Array<[string, Record<string, unknown>, number]> = [
  ['transactions', { id: 'tx-e', booking_kind: 'pharmacy', booking_id: 'po-e', patient_id: ID, patient_name: PII.name, amount: 115, currency: 'SAR', gateway: 'moyasar', status: 'paid' }, 115],
  ['moyasar_payments', { id: 'mp-e', moyasar_id: 'pay_e', patient_id: ID, amount: 115, currency: 'SAR', status: 'paid', customer_email: PII.email }, 115],
  ['einvoices', { id: 'ei-e', patient_id: ID, buyer_name: PII.name, buyer_phone: PII.phone, amount: 115, vat: 15, total: 115 }, 115],
  ['invoices', { id: 'inv-e', patient_id: ID, customer_name: PII.name, customer_email: PII.email, amount: 200 }, 200],
  ['wallet_transactions', { id: 'wt-e', owner_id: ID, owner_type: 'patient', amount: 50, type: 'credit' }, 50],
];
const OTHER: Array<[string, Record<string, unknown>]> = [
  ['patient_profiles', { id: 'pp-e', user_id: ID, full_name: PII.name, phone: PII.phone, national_id: PII.national_id, addresses: [{ id: 'ad-e', street: PII.street, city: 'Riyadh' }] }],
  ['pharmacy_orders', { id: 'po-e', patient_account_id: ID, patient_name: PII.name, patient_phone: PII.phone, status: 'delivered', delivery_address: { street: PII.street, city: 'Riyadh', phone: PII.phone }, items: [{ raw_name: 'Panadol', qty: 1 }], totals: { total: 115 } }],
  ['orders', { id: 'or-e', patient_id: ID, patient_name: PII.name, patient_phone: PII.phone, total: 40 }],
  ['reviews', { id: 'rv-e', patient_id: ID, patient_name: PII.name, rating: 5, comment: 'great' }],
  ['notifications', { id: 'nt-e', user_id: ID, title: `Hello ${PII.name}`, body: 'x' }],
];

describe('D-32: erasing my account removes who I am and keeps my medical and payment records', () => {
  const stack = new LiveStack();
  let token = '';
  let erase: { status: number; body: any } = { status: 0, body: null };

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      for (const [coll, doc] of [...MEDICAL.map(([c, d]) => [c, d] as const), ...MONEY.map(([c, d]) => [c, d] as const), ...OTHER]) {
        await db.collection(coll).insertOne({ createdAt: now(), updatedAt: now(), ...doc });
      }
    });
    token = await stack.patient(ID);
    await stack.db.collection('users').updateOne({ id: ID }, { $set: {
      full_name: PII.name, phone: PII.phone, email: PII.email, national_id: PII.national_id,
      password_hash: await bcrypt.hash(PASSWORD, 10), role: 'patient', active: true,
    } });
    erase = await stack.call(0, 'DELETE', '/api/v1/users/me', token, { password: PASSWORD });
  });
  afterAll(async () => { await stack.stop(); });

  it('the erasure request succeeds', () => {
    expect([erase.status, JSON.stringify(erase.body).slice(0, 300)]).toEqual([expect.any(Number), expect.any(String)]);
    expect(erase.status).toBeLessThan(300);
  });

  it('no collection still holds my name, phone, email, national id or street', async () => {
    const found: string[] = [];
    const colls = await stack.db.listCollections().toArray();
    for (const { name } of colls) {
      if (name.startsWith('system.')) continue;
      for (const doc of await stack.db.collection(name).find({}).toArray()) {
        const text = JSON.stringify(doc);
        for (const v of PII_VALUES) if (text.includes(v)) found.push(`${name}#${(doc as any).id ?? (doc as any)._id}: ${v}`);
      }
    }
    expect(found).toEqual([]);
  });

  it('my medical records are kept, with their clinical content', async () => {
    const missing: string[] = [];
    for (const [coll, doc, content] of MEDICAL) {
      const kept = await stack.db.collection(coll).findOne({ id: doc.id });
      if (!kept || !JSON.stringify(kept).includes(content)) missing.push(`${coll}#${doc.id}`);
    }
    expect(missing).toEqual([]);
  });

  it('my invoices and payments are kept, with their amounts', async () => {
    const missing: string[] = [];
    for (const [coll, doc, amount] of MONEY) {
      const kept: any = await stack.db.collection(coll).findOne({ id: doc.id });
      if (!kept || Number(kept.amount) !== amount) missing.push(`${coll}#${doc.id}`);
    }
    expect(missing).toEqual([]);
  });

  it('the old credentials no longer sign in', async () => {
    const r = await stack.call(0, 'POST', '/api/v1/auth/login', undefined, { identifier: PII.email, password: PASSWORD });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  });
});
