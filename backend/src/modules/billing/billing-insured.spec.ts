import { BillingService, decodeTlv } from './billing.module';

// An insured booking's co-pay is paid on its insurance request (transactions.booking_kind 'insurance').
function build(opts: { booking: any; copay?: any; request?: any }) {
  const store: any[] = [];
  const match = (q: any) => (d: any) => Object.entries(q).every(([k, v]: [string, any]) => (v && typeof v === 'object' && '$ne' in v ? d[k] !== v.$ne : v && typeof v === 'object' && '$eq' in v ? d[k] === v.$eq : d[k] === v));
  const invoices = {
    findOne: jest.fn((q: any) => ({ lean: async () => store.find(match(q)) ?? null })),
    find: jest.fn((q: any) => ({ lean: async () => store.filter((d) => Object.entries(q).every(([k, v]: [string, any]) => (v && typeof v === 'object' && '$in' in v ? v.$in.includes(d[k]) : d[k] === v))) })),
    updateOne: jest.fn(async () => ({})),
    create: jest.fn(async (d: any) => { const row = { id: `i${store.length + 1}`, status: 'ISSUED', ...d }; store.push(row); return row; }),
  };
  const collections: Record<string, any> = {
    transactions: {
      find: jest.fn(() => ({ toArray: async () => [] })), // nothing is paid on the booking itself
      findOne: jest.fn(async (q: any) => (q.booking_kind === 'insurance' ? opts.copay ?? null : null)),
    },
    insuranceservicerequests: {
      find: jest.fn(() => ({ limit: () => ({ toArray: async () => [{ id: 'req-1' }] }) })),
      findOne: jest.fn(async () => opts.request ?? null),
    },
    finance_config: { findOne: jest.fn(async () => null) },
    pharmacy_orders: { findOne: jest.fn(async () => null) },
    counters: { findOneAndUpdate: jest.fn(async () => ({ seq: 3 })) },
  };
  const conn: any = {
    model: (n: string) => (n === 'EInvoice' ? invoices : { findOne: () => ({ lean: async () => opts.booking }) }),
    collection: (n: string) => collections[n],
  };
  return { svc: new BillingService(conn), store };
}
const patient = { id: 'p1', role: 'patient' };
beforeEach(() => { process.env.ZATCA_SELLER_NAME = 'Test Seller'; process.env.ZATCA_VAT_NUMBER = '300000000000003'; });
const booking = { patient_id: 'p1', payment_method: 'insurance', total_price: 400, insurance_provider: 'Bupa', items: [] };
const copay = { status: 'paid', amount: 80, method: 'card', webhook_payload: { source: { number: 'XXXX-XXXX-XXXX-1881' } } };

describe('invoice of an insured booking', () => {
  it('is issued for the co-pay paid on the insurance request, with the insurer share', async () => {
    const { svc } = build({ booking, copay });
    const inv: any = await svc.issue(patient, 'consultation', 'a1');
    expect(inv).toMatchObject({ total: 80, payment: { method: 'card', last4: '1881' }, insured: { insurer: 'Bupa', price: 400, covered: 320, copay: 80 } });
    expect(decodeTlv(inv.qr_base64)[4]).toBe('80.00');
  });

  it('payment.completed of the co-pay (kind insurance) invoices the booking the request is for', async () => {
    const { svc, store } = build({ booking, copay, request: { booking_id: 'a1', booking_kind: 'consultation' } });
    await svc.issueOnPayment({ booking_kind: 'insurance', booking_id: 'req-1' });
    expect(store[0]).toMatchObject({ booking_kind: 'consultation', booking_id: 'a1', total: 80 });
  });

  it('a refund of the co-pay credits the booking invoice', async () => {
    const { svc, store } = build({ booking, copay, request: { booking_id: 'a1', booking_kind: 'consultation' } });
    await svc.issueOnPayment({ booking_kind: 'insurance', booking_id: 'req-1' });
    const cn: any = await svc.issueCreditNote({ booking_kind: 'insurance', booking_id: 'req-1', amount: 80, refund_ref: 'rf_1' });
    expect(cn).toMatchObject({ type: 'credit_note', booking_kind: 'consultation', booking_id: 'a1', total: -80, original_invoice_no: store[0].invoice_no });
  });

  it('a co-pay request with no booking issues nothing and does not throw', async () => {
    const { svc, store } = build({ booking, copay, request: { booking_kind: 'consultation' } });
    await expect(svc.issueOnPayment({ booking_kind: 'insurance', booking_id: 'req-1' })).resolves.toBeUndefined();
    expect(store).toHaveLength(0);
  });
});
