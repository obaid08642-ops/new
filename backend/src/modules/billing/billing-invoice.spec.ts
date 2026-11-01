import { BillingService } from './billing.module';

/** A VAT number on file: the platform is registered, so it issues tax invoices. Without `invoice` the documents are payment receipts. */
const REGISTERED = { seller_name: 'منصة نبض الطبية', vat_number: '300000000000003' };

function build(opts: { booking?: any; txns?: any[]; cfg?: any; existing?: any; invoice?: any }) {
  const created: any[] = [];
  const invoices = {
    findOne: jest.fn(() => ({ lean: async () => opts.existing ?? created[0] ?? null })),
    create: jest.fn(async (d: any) => { const row = { id: 'inv-1', ...d }; created.push(row); return row; }),
    find: jest.fn(() => ({ lean: async () => [] })), // no credit notes
    updateOne: jest.fn(async () => ({})),
  };
  const collections: Record<string, any> = {
    transactions: { find: jest.fn(() => ({ toArray: async () => opts.txns ?? [] })), findOne: jest.fn(async () => null) },
    insuranceservicerequests: { find: jest.fn(() => ({ limit: () => ({ toArray: async () => [] }) })), findOne: jest.fn(async () => null) },
    finance_config: { findOne: jest.fn(async (q: any) => (q?.key === 'invoice' ? opts.invoice ?? null : opts.cfg ?? null)) },
    pharmacy_orders: { findOne: jest.fn(async () => null) },
    counters: { findOneAndUpdate: jest.fn(async () => ({ seq: 7 })) },
  };
  const conn: any = {
    model: (n: string) => (n === 'EInvoice' ? invoices : { findOne: () => ({ lean: async () => opts.booking ?? null }) }),
    collection: (n: string) => collections[n],
  };
  return { svc: new BillingService(conn), invoices, created };
}
const patient = { id: 'p1', role: 'patient' };

describe('e-invoice of a paid booking', () => {
  it('refuses a booking nobody has paid', async () => {
    const { svc } = build({ booking: { patient_id: 'p1', total: 100 }, txns: [] });
    await expect(svc.issue(patient, 'lab', 'b1')).rejects.toThrow('booking_not_paid');
  });

  it('invoices what was charged, not the booking price: an insured co-pay', async () => {
    const { svc, created } = build({ booking: { patient_id: 'p1', total: 400 }, txns: [{ amount: 60 }], invoice: REGISTERED });
    await svc.issue(patient, 'lab', 'b1');
    expect(created[0]).toMatchObject({ total: 60, vat_amount: 7.83, subtotal: 52.17, vat_rate: 0.15 });
  });

  it('takes the VAT rate from the finance config', async () => {
    const { svc, created } = build({ booking: { patient_id: 'p1' }, txns: [{ amount: 110 }], cfg: { tax: { vat_percent: 10 } }, invoice: REGISTERED });
    await svc.issue(patient, 'consultation', 'b1');
    expect(created[0]).toMatchObject({ total: 110, vat_amount: 10, subtotal: 100, vat_rate: 0.1 });
  });

  it('asks the transactions under the payments name of the kind (appointment = consultation)', async () => {
    const { svc } = build({ booking: { patient_id: 'p1' }, txns: [{ amount: 50 }] });
    await svc.issue(patient, 'appointment', 'b1');
    const find = (svc as any).conn.collection('transactions').find;
    expect(find.mock.calls[0][0]).toMatchObject({ booking_kind: 'consultation', booking_id: 'b1' });
  });

  it('a cash booking is invoiced at the cash the provider recorded as collected', async () => {
    const { svc, created } = build({ booking: { patient_id: 'p1', collection_proof: { amount_collected: 80 } }, txns: [] });
    await svc.issue(patient, 'nursing', 'b1');
    expect(created[0].total).toBe(80);
  });

  it('another patient cannot issue or read it', async () => {
    const { svc } = build({ booking: { patient_id: 'someone-else' }, txns: [{ amount: 50 }] });
    await expect(svc.issue(patient, 'lab', 'b1')).rejects.toThrow('not your booking');
  });

  it('payment.completed issues the invoice for the system and never throws', async () => {
    const { svc, created } = build({ booking: { patient_id: 'p1' }, txns: [{ amount: 115 }], invoice: REGISTERED });
    await svc.issueOnPayment({ booking_kind: 'lab', booking_id: 'b1' });
    expect(created[0]).toMatchObject({ booking_kind: 'lab', total: 115, vat_amount: 15 });
    const none = build({ booking: null as any, txns: [] });
    await expect(none.svc.issueOnPayment({ booking_kind: 'lab', booking_id: 'x' })).resolves.toBeUndefined();
    await expect(none.svc.issueOnPayment({ booking_kind: 'insurance', booking_id: 'x' })).resolves.toBeUndefined();
  });
});
