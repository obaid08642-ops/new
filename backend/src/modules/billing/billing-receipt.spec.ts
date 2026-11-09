import { BillingService, decodeTlv, tlvQr } from './billing.module';

type Opts = { booking?: any; txns?: any[]; txn?: any; cfg?: Record<string, any>; invoices?: any[] };

function build(o: Opts) {
  const store: any[] = [...(o.invoices || [])];
  const match = (q: any) => (d: any) => Object.entries(q).every(([k, v]: [string, any]) => (v && typeof v === 'object' && '$ne' in v ? d[k] !== v.$ne : v && typeof v === 'object' && '$eq' in v ? d[k] === v.$eq : d[k] === v));
  const invoices = {
    findOne: jest.fn((q: any) => ({ lean: async () => store.find(match(q)) ?? null })),
    find: jest.fn((q: any) => ({ lean: async () => store.filter((d) => Object.entries(q).every(([k, v]: [string, any]) => (v && typeof v === 'object' && '$in' in v ? v.$in.includes(d[k]) : d[k] === v))) })),
    updateOne: jest.fn(async () => ({})),
    create: jest.fn(async (d: any) => { const row = { id: `i${store.length + 1}`, ...d }; store.push(row); return row; }),
  };
  const collections: Record<string, any> = {
    transactions: { find: jest.fn(() => ({ toArray: async () => o.txns ?? [] })), findOne: jest.fn(async () => o.txn ?? null) },
    insuranceservicerequests: { find: jest.fn(() => ({ limit: () => ({ toArray: async () => [] }) })), findOne: jest.fn(async () => null) },
    finance_config: { findOne: jest.fn(async (q: any) => o.cfg?.[q.key] ?? null) },
    pharmacy_orders: { findOne: jest.fn(async () => null) },
    counters: { findOneAndUpdate: jest.fn(async () => ({ seq: 7 })) },
  };
  const conn: any = {
    model: (n: string) => (n === 'EInvoice' ? invoices : { findOne: () => ({ lean: async () => o.booking ?? null }) }),
    collection: (n: string) => collections[n],
  };
  return { svc: new BillingService(conn), store };
}
const patient = { id: 'p1', role: 'patient' };
const env = { ...process.env };
beforeEach(() => { process.env.ZATCA_SELLER_NAME = 'Test Seller'; process.env.ZATCA_VAT_NUMBER = '300000000000003'; }); // the owner's values; the service never invents them
afterEach(() => { process.env = { ...env }; });

describe('ZATCA phase-1 QR payload', () => {
  it('tlvQr decodes back to the five tags', () => {
    const qr = tlvQr('منصة نبض', '300000000000003', '2026-10-31T13:00:00.000Z', 115, 15);
    expect(decodeTlv(qr)).toEqual({ 1: 'منصة نبض', 2: '300000000000003', 3: '2026-10-31T13:00:00.000Z', 4: '115.00', 5: '15.00' });
  });

  it('an issued invoice carries seller, VAT number, its own timestamp, total incl. VAT and VAT', async () => {
    process.env.ZATCA_SELLER_NAME = 'Seller Env Co';
    process.env.ZATCA_VAT_NUMBER = '399999999900003';
    // Model A: platform VAT is the VAT inside the delivery fee (15 of the 115 paid)
    const { svc } = build({ booking: { patient_id: 'p1', delivery_fee: 15 }, txns: [{ amount: 115 }] });
    const inv: any = await svc.issue(patient, 'lab', 'b1');
    const tags = decodeTlv(inv.qr_base64);
    expect(tags[1]).toBe('Seller Env Co');
    expect(tags[2]).toBe('399999999900003');
    expect(tags[3]).toBe(new Date(inv.issued_at).toISOString());
    expect(tags[4]).toBe('115.00');
    expect(tags[5]).toBe('1.96');
  });

  it('finance_config wins over the environment for seller and VAT number', async () => {
    process.env.ZATCA_SELLER_NAME = 'Env';
    process.env.ZATCA_VAT_NUMBER = '1';
    const { svc } = build({ booking: { patient_id: 'p1' }, txns: [{ amount: 23 }], cfg: { invoice: { seller_name: 'Config Seller', vat_number: '311111111100003' } } });
    const tags = decodeTlv(((await svc.issue(patient, 'lab', 'b1')) as any).qr_base64);
    expect(tags[1]).toBe('Config Seller');
    expect(tags[2]).toBe('311111111100003');
  });

  it('with no seller configured the invoice is issued, says so, and carries no QR and no invented name or number', async () => {
    delete process.env.ZATCA_SELLER_NAME;
    delete process.env.ZATCA_VAT_NUMBER;
    const { svc } = build({ booking: { patient_id: 'p1' }, txns: [{ amount: 115 }] });
    const inv: any = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(inv).toMatchObject({ seller_complete: false, seller: { legal_name: null, vat_number: null, configured: false }, qr: null, total: 115 });
    expect(inv.qr_base64).toBeNull();
  });
});

describe('receipt content', () => {
  it('lines, payment method and last 4, insured split and the invoice number', async () => {
    const booking = { patient_id: 'p1', payment_method: 'insurance', insurance_provider: 'Bupa', total: 400, items: [{ name_ar: 'سكر', name_en: 'Glucose', price: 150, qty: 1 }, { name_en: 'CBC', price: 250, qty: 1 }] };
    const txn = { method: 'card', webhook_payload: { source: { number: 'XXXX-XXXX-XXXX-4242' } } };
    const { svc } = build({ booking, txns: [{ amount: 60 }], txn });
    const inv: any = await svc.issue(patient, 'lab', 'b1');
    expect(inv.invoice_no).toBe('INV-2026-000007'.replace('2026', String(new Date().getFullYear())));
    expect(inv.lines.map((l: any) => [l.name_en, l.amount])).toEqual([['Glucose', 150], ['CBC', 250]]);
    expect(inv.payment).toEqual({ method: 'card', last4: '4242' });
    expect(inv.insured).toEqual({ insurer: 'Bupa', price: 400, covered: 340, copay: 60 });
    expect(inv.total).toBe(60);
  });

  it('a consultation shows its fee and platform fee lines; the API adds the QR block and the PDF link', async () => {
    const { svc } = build({ booking: { patient_id: 'p1', price: 200, service_fee: 30, total_price: 230 }, txns: [{ amount: 230 }] });
    const inv: any = await svc.present(await svc.issue(patient, 'consultation', 'b1'));
    expect(inv.lines.map((l: any) => [l.key, l.amount])).toEqual([['consultation_fee', 200], ['platform_fee', 30]]);
    expect(inv.qr).toEqual({ format: 'zatca-phase1-tlv-base64', payload: inv.qr_base64 });
    expect(inv.pdf_url).toBe(`/billing/documents/${inv.invoice_no}/pdf`);
  });

  it('only the last four digits of a card are kept', async () => {
    const { svc } = build({ booking: { patient_id: 'p1' }, txns: [{ amount: 10 }], txn: { method: 'card', webhook_payload: { source: { number: '4111111111111111' } } } });
    expect(((await svc.issue(patient, 'lab', 'b1')) as any).payment.last4).toBe('1111');
  });
});

describe('PDF', () => {
  it('is a PDF drawn from the stored document and encodes the same QR payload', async () => {
    const { svc } = build({ booking: { patient_id: 'p1' }, txns: [{ amount: 115 }] });
    const inv: any = await svc.issue(patient, 'lab', 'b1');
    const qrcode = require('qrcode');
    const spy = jest.spyOn(qrcode, 'toBuffer');
    const pdf = await svc.renderPdf(inv);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(spy.mock.calls[0][0]).toBe(inv.qr_base64);
    spy.mockRestore();
  });
});

describe('credit note on refund', () => {
  const paid = { invoice_no: 'INV-2026-000001', type: 'invoice', status: 'ISSUED', booking_kind: 'lab', booking_id: 'b1', patient_id: 'p1', total: 115, subtotal: 100, vat_amount: 15, vat_rate: 0.15, seller_name: 'S', vat_number: '300000000000003', payment: { method: 'card', last4: '4242' } };

  it('is a negative invoice that names the original and carries its own QR', async () => {
    const { svc } = build({ invoices: [paid] });
    const cn: any = await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 115, refund_ref: 'rf_1' });
    expect(cn).toMatchObject({ type: 'credit_note', original_invoice_no: 'INV-2026-000001', total: -115, vat_amount: -15, subtotal: -100, refund_ref: 'rf_1' });
    expect(cn.invoice_no).toMatch(/^CN-\d{4}-000007$/);
    const tags = decodeTlv(cn.qr_base64);
    expect([tags[4], tags[5]]).toEqual(['-115.00', '-15.00']);
  });

  it('a partial refund is a partial credit note; a repeat of the same refund issues nothing new', async () => {
    const { svc, store } = build({ invoices: [paid] });
    const first: any = await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 23, refund_ref: 'rf_2' });
    expect(first).toMatchObject({ total: -23, vat_amount: -3 });
    const again: any = await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 23, refund_ref: 'rf_2' });
    expect(again.invoice_no).toBe(first.invoice_no);
    expect(store.filter((d) => d.type === 'credit_note')).toHaveLength(1);
  });

  it('a refund of a booking that was never invoiced issues nothing and does not throw', async () => {
    const { svc } = build({ invoices: [] });
    await expect(svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'zzz', amount: 10, refund_ref: 'rf_3' })).resolves.toBeNull();
  });

  it('a credit note never exceeds the invoice', async () => {
    const { svc } = build({ invoices: [paid] });
    expect(((await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 999, refund_ref: 'rf_4' })) as any).total).toBe(-115);
  });
});
