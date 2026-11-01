import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BillingService, decodeTlv } from './billing.module';

/**
 * GET /billing/invoice/:kind/:id: what the receipt screens may show, every figure stored from the payment and the booking when the
 * invoice was issued. Cash, card, insured and refunded invoices; the seller fields come from config and are never invented.
 */
type World = { booking: any; txns?: any[]; copayTxn?: any; cfg?: Record<string, any>; profile?: any };

function world(w: World, store: any[] = []) {
  const match = (q: any) => (d: any) => Object.entries(q).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && '$ne' in v) return d[k] !== v.$ne;
    if (v && typeof v === 'object' && '$eq' in v) return d[k] === v.$eq;
    if (v && typeof v === 'object' && '$in' in v) return v.$in.includes(d[k]);
    return d[k] === v;
  });
  const invoices = {
    findOne: (q: any) => ({ lean: async () => store.find(match(q)) ?? null }),
    find: (q: any) => ({ lean: async () => store.filter(match(q)) }),
    create: async (d: any) => { const row = { id: `i${store.length + 1}`, status: 'ISSUED', createdAt: new Date(), ...d }; store.push(row); return row; },
    updateOne: async (q: any, u: any) => { const row = store.find(match(q)); if (row) Object.assign(row, u.$set); return {}; },
  };
  const collections: Record<string, any> = {
    transactions: {
      find: () => ({ toArray: async () => w.txns ?? [] }),
      findOne: async (q: any) => (q.booking_kind === 'insurance' ? w.copayTxn ?? null : (w.txns ?? [])[0] ?? null),
    },
    insuranceservicerequests: { find: () => ({ limit: () => ({ toArray: async () => (w.copayTxn ? [{ id: 'req-1' }] : []) }) }), findOne: async () => null },
    finance_config: { findOne: async (q: any) => w.cfg?.[q.key] ?? null },
    pharmacy_orders: { findOne: async () => null },
    users: { findOne: async () => ({ id: 'p1', email: 'patient@example.test' }) },
    provider_profiles: { findOne: async () => w.profile ?? null },
    pharmacy_allocations: { findOne: async () => null },
    counters: { findOneAndUpdate: async () => ({ seq: 1 }) },
  };
  const conn: any = {
    model: (n: string) => (n === 'EInvoice' ? invoices : { findOne: () => ({ lean: async () => w.booking }) }),
    collection: (n: string) => collections[n],
  };
  return { svc: new BillingService(conn), store };
}
const patient = { id: 'p1', role: 'patient' };
const env = { ...process.env };
beforeEach(() => { process.env.ZATCA_SELLER_NAME = 'Nabd Health Co'; process.env.ZATCA_VAT_NUMBER = '300000000000003'; });
afterEach(() => { process.env = { ...env }; });

const qrOf = (inv: any) => decodeTlv(inv.qr.payload);
/** The QR states exactly the invoice's own total and VAT. */
function expectQrMatches(inv: any) {
  const tags = qrOf(inv);
  expect(tags[1]).toBe(inv.seller.legal_name);
  expect(tags[2]).toBe(inv.seller.vat_number);
  expect(tags[3]).toBe(new Date(inv.issued_at).toISOString());
  expect(tags[4]).toBe(Number(inv.total).toFixed(2));
  expect(tags[5]).toBe(Number(inv.vat_amount).toFixed(2));
  expect(Math.round((inv.subtotal + inv.vat_amount) * 100) / 100).toBe(inv.total);
}

describe('a cash invoice', () => {
  it('lines, the cash method with no card digits, no discount, no insurer, paid, seller from config, QR on the same totals', async () => {
    const { svc } = world({ booking: { patient_id: 'p1', payment_method: 'cash', collection_proof: { amount_collected: 150 }, items: [{ name_en: 'Glucose', name_ar: 'سكر', price: 150, qty: 1 }] } });
    const inv = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(inv).toMatchObject({ type: 'invoice', total: 150, vat_amount: 0, subtotal: 150, vat_basis: 'delivery_fee', discount: 0, insured: null, state: 'paid', refunded_total: 0, credit_notes: [] });
    expect(inv.lines).toEqual([{ key: 'item', name_ar: 'سكر', name_en: 'Glucose', qty: 1, unit_price: 150, amount: 150 }]);
    expect(inv.payment).toEqual({ method: 'cash', last4: null });
    expect(inv.seller).toEqual({ legal_name: 'Nabd Health Co', vat_number: '300000000000003', cr_number: null, address: null, configured: true });
    expectQrMatches(inv);
  });
});

describe('a card invoice', () => {
  const card = (number: string) => ({ amount: 140, method: 'card', webhook_payload: { source: { number, company: 'visa', name: 'A B' } } });
  const booking = { patient_id: 'p1', payment_method: 'card', coupon_discount: 10, total: 140, items: [{ name_en: 'CBC', price: 100, qty: 1 }, { name_en: 'Vitamin D', price: 50, qty: 1 }] };

  it('the lines add up to the price before the discount; total is after it; method and last 4 from the gateway record', async () => {
    const { svc } = world({ booking, txns: [card('XXXX-XXXX-XXXX-4242')] });
    const inv = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(inv.lines.map((l: any) => [l.name_en, l.amount])).toEqual([['CBC', 100], ['Vitamin D', 50]]);
    expect(inv).toMatchObject({ discount: 10, total: 140, vat_amount: 0, subtotal: 140 });
    expect(inv.lines.reduce((s: number, l: any) => s + l.amount, 0) - inv.discount).toBe(inv.total);
    expect(inv.payment).toEqual({ method: 'card', last4: '4242' });
    expectQrMatches(inv);
  });

  it('a booking that carries no total of its own gets no made-up adjustment line', async () => {
    const { svc } = world({ booking: { ...booking, total: undefined }, txns: [card('XXXX-XXXX-XXXX-4242')] });
    const inv = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(inv.lines.map((l: any) => l.key)).toEqual(['item', 'item']);
  });

  it('never more than the last 4 digits: a full card number from the gateway appears nowhere in the response', async () => {
    const { svc } = world({ booking, txns: [card('4111111111114242')] });
    const inv = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(inv.payment.last4).toBe('4242');
    expect(JSON.stringify(inv)).not.toMatch(/4111111111114242|4111\s?1111/);
    expect(JSON.stringify(inv)).not.toContain('webhook_payload');
  });
});

describe('an insured invoice', () => {
  it('states the insurer share and the patient share; the invoice is for the patient share', async () => {
    const booking = { patient_id: 'p1', payment_method: 'insurance', insurance_provider: 'Bupa', total_price: 400, items: [{ name_en: 'MRI', price: 400, qty: 1 }] };
    const copayTxn = { status: 'paid', amount: 80, method: 'card', webhook_payload: { source: { number: 'XXXX-XXXX-XXXX-1881' } } };
    const { svc } = world({ booking, copayTxn });
    const inv = await svc.present(await svc.issue(patient, 'radiology', 'b1'));
    expect(inv.insured).toEqual({ insurer: 'Bupa', price: 400, covered: 320, copay: 80, insurer_share: 320, patient_share: 80 });
    expect(inv).toMatchObject({ total: 80, discount: 0 });
    expect(inv.lines.reduce((s: number, l: any) => s + l.amount, 0)).toBe(400); // the lines are the whole service; the insurer share is stated apart
    expect(inv.payment).toEqual({ method: 'card', last4: '1881' });
    expectQrMatches(inv);
  });
});

describe('a refunded invoice', () => {
  // Model A: the VAT on the document is the VAT inside the delivery fee (15 of the 115), nothing on the service price
  const booking = { patient_id: 'p1', payment_method: 'card', items: [{ name_en: 'CBC', price: 100, qty: 1 }], delivery_fee: 15 };
  const txns = [{ amount: 115, method: 'card', webhook_payload: { source: { number: 'XXXX-XXXX-XXXX-4242' } } }];

  it('shows paid until a credit note exists', async () => {
    const { svc } = world({ booking, txns });
    expect((await svc.present(await svc.issue(patient, 'lab', 'b1'))).state).toBe('paid');
  });

  it('a full refund: state refunded, the credit note referenced, its QR negative and consistent', async () => {
    const { svc, store } = world({ booking, txns });
    const issued = await svc.issue(patient, 'lab', 'b1');
    const note: any = await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 115, refund_ref: 'rf_1' });
    const inv = await svc.present(issued);
    expect(inv).toMatchObject({ state: 'refunded', refunded_total: 115 });
    expect(inv.credit_notes).toEqual([expect.objectContaining({ invoice_no: note.invoice_no, total: -115, vat_amount: -1.96 })]);
    const cn = await svc.present(store.find((d) => d.invoice_no === note.invoice_no));
    expect(cn).toMatchObject({ state: 'credit_note', type: 'credit_note', original_invoice_no: inv.invoice_no, total: -115 });
    expect(qrOf(cn)[4]).toBe('-115.00');
    expect(qrOf(cn)[5]).toBe('-1.96');
  });

  it('a partial refund takes its share of the VAT of the invoice it reverses', async () => {
    const { svc, store } = world({ booking, txns });
    await svc.issue(patient, 'lab', 'b1');
    const note: any = await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 23, refund_ref: 'rf_p' });
    expect(note).toMatchObject({ total: -23, vat_amount: -0.39, subtotal: -22.61 }); // 1.96 x 23 / 115
    expect(store.length).toBe(2);
  });

  it('a partial refund: partially_refunded, then refunded once the credit notes add up', async () => {
    const { svc } = world({ booking, txns });
    const issued = await svc.issue(patient, 'lab', 'b1');
    await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 23, refund_ref: 'rf_a' });
    expect(await svc.present(issued)).toMatchObject({ state: 'partially_refunded', refunded_total: 23 });
    await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 92, refund_ref: 'rf_b' });
    const inv = await svc.present(issued);
    expect(inv).toMatchObject({ state: 'refunded', refunded_total: 115 });
    expect(inv.credit_notes).toHaveLength(2);
  });

  it('a list carries the state of each invoice with one credit-note query', async () => {
    const { svc } = world({ booking, txns });
    const issued = await svc.issue(patient, 'lab', 'b1');
    await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 115, refund_ref: 'rf_1' });
    const rows = await svc.presentMany([issued]);
    expect(rows[0]).toMatchObject({ state: 'refunded' });
  });
});

describe('the seller is the owner\'s to supply', () => {
  it('finance_config wins over the environment', async () => {
    const { svc } = world({ booking: { patient_id: 'p1' }, txns: [{ amount: 23, method: 'card' }], cfg: { invoice: { seller_name: 'Config Co', vat_number: '311111111100003' } } });
    expect((await svc.present(await svc.issue(patient, 'lab', 'b1'))).seller).toEqual({ legal_name: 'Config Co', vat_number: '311111111100003', cr_number: null, address: null, configured: true });
  });
});

describe('the content the owner asked for', () => {
  const lab = { type: 'lab', name_ar: 'مختبر الحبيب', name_en: 'Al Habib Lab', moh_license_number: 'MOH-LAB-2210', email: 'private@lab.test', phone: '+966500000000', bank: { iban: 'SA00' } };
  const booking = { patient_id: 'p1', patient_name: 'أحمد القحطاني', tracking_id: 'LAB-7F3A', provider_account_id: 'lab-1', items: [{ name_en: 'CBC', price: 115, qty: 1 }] };

  it('the provider block: name, type and licence number of the party that delivered the service, and nothing else of its profile', async () => {
    const { svc } = world({ booking, txns: [{ amount: 115, method: 'card' }], profile: lab });
    const inv = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(inv.provider).toEqual({ name_ar: 'مختبر الحبيب', name_en: 'Al Habib Lab', facility_name: null, type: 'lab', license_number: 'MOH-LAB-2210' });
    expect(JSON.stringify(inv)).not.toMatch(/private@lab|\+966500000000|SA00/);
  });

  it('a doctor\'s licence is the SCFHS one; a pharmacy\'s is the SFDA one', async () => {
    const doctor = { type: 'doctor', display_name_ar: 'د. سارة', name_en: 'Dr Sara', clinic_name: 'Sara Clinic', scfhs_license_number: 'SCFHS-1', moh_license_number: 'MOH-9' };
    const a = world({ booking: { patient_id: 'p1', doctor_id: 'd1', price: 100, total_price: 115, service_fee: 15 }, txns: [{ amount: 115, method: 'card' }], profile: doctor });
    expect((await a.svc.present(await a.svc.issue(patient, 'consultation', 'b1'))).provider).toMatchObject({ name_ar: 'د. سارة', name_en: 'Dr Sara', facility_name: 'Sara Clinic', type: 'doctor', license_number: 'SCFHS-1' });
    const ph = world({ booking: { patient_id: 'p1', pharmacy_id: 'ph1', total: 40 }, txns: [{ amount: 40, method: 'card' }], profile: { type: 'pharmacy', name_ar: 'صيدلية النور', sfda_license_number: 'SFDA-5', moh_license_number: 'MOH-2' } });
    expect((await ph.svc.present(await ph.svc.issue(patient, 'pharmacy', 'b1'))).provider).toMatchObject({ type: 'pharmacy', license_number: 'SFDA-5' });
  });

  it('a provider we cannot find, or hold no licence for, is null or has a null licence: nothing invented', async () => {
    const none = world({ booking, txns: [{ amount: 115, method: 'card' }] });
    expect((await none.svc.present(await none.svc.issue(patient, 'lab', 'b1'))).provider).toBeNull();
    const noLicence = world({ booking, txns: [{ amount: 115, method: 'card' }], profile: { type: 'lab', name_ar: 'مختبر' } });
    expect((await noLicence.svc.present(await noLicence.svc.issue(patient, 'lab', 'b1'))).provider.license_number).toBeNull();
  });

  it('the seller block carries the CR number and the address from config; empty stays null', async () => {
    const full = world({ booking, txns: [{ amount: 115, method: 'card' }], cfg: { invoice: { seller_name: 'شركة نبض', vat_number: '300000000000003', cr_number: '1010000000', address: 'الرياض' } } });
    expect((await full.svc.present(await full.svc.issue(patient, 'lab', 'b1'))).seller).toEqual({ legal_name: 'شركة نبض', vat_number: '300000000000003', cr_number: '1010000000', address: 'الرياض', configured: true });
    const bare = world({ booking, txns: [{ amount: 115, method: 'card' }] });
    expect((await bare.svc.present(await bare.svc.issue(patient, 'lab', 'b1'))).seller).toMatchObject({ cr_number: null, address: null });
  });

  it('the booking number, the optional patient name, and the footer with support contact and the refund policy link', async () => {
    const w = world({ booking, txns: [{ amount: 115, method: 'card' }], cfg: { invoice: { seller_name: 'N', vat_number: '3', support_email: 'help@nabd.example', support_phone: '+966110000000' } } });
    const inv = await w.svc.present(await w.svc.issue(patient, 'lab', 'b1'));
    expect(inv).toMatchObject({ booking_ref: 'LAB-7F3A', patient_name: 'أحمد القحطاني' });
    expect(inv.footer).toEqual({ support_email: 'help@nabd.example', support_phone: '+966110000000', refund_policy_url: { ar: 'https://nabd.plus/ar/refund-policy', en: 'https://nabd.plus/en/refund-policy' } });
    const anon = world({ booking: { ...booking, patient_name: undefined, tracking_id: undefined }, txns: [{ amount: 115, method: 'card' }] });
    const bare = await anon.svc.present(await anon.svc.issue(patient, 'lab', 'booking-1234567'));
    expect(bare.patient_name).toBeNull();
    expect(bare.booking_ref).toBe('booking-');
    expect(bare.footer.support_email).toBeNull(); // nothing invented
  });
});

/**
 * ONE switch (common/tax-registration.ts): a VAT number on file = simplified tax invoice; none = payment receipt. The platform is not
 * registered yet, so the receipt is what patients get today. Prices and amounts are the same in both modes.
 */
describe('receipt mode: the platform has no VAT number', () => {
  const booking = { patient_id: 'p1', payment_method: 'card', items: [{ name_en: 'CBC', name_ar: 'صورة دم', price: 100, qty: 1 }], delivery_fee: 15 };
  const txns = [{ amount: 115, method: 'card', webhook_payload: { source: { number: 'XXXX-XXXX-XXXX-4242' } } }];
  const unregistered = () => { delete process.env.ZATCA_SELLER_NAME; delete process.env.ZATCA_VAT_NUMBER; };
  const owner = { seller_name: 'منصة نبض الطبية' }; // issued: the name only; CR number, VAT number and address are not issued yet

  it('a payment receipt: its own number series, no VAT, no rate, no QR, the total is what was paid', async () => {
    unregistered();
    const { svc } = world({ booking, txns, cfg: { invoice: owner } });
    const r = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(r).toMatchObject({
      document_kind: 'receipt', title: { ar: 'إيصال دفع', en: 'Payment receipt' }, type: 'invoice',
      vat_rate: null, vat_amount: null, subtotal: 115, total: 115, qr: null,
      seller: { legal_name: 'منصة نبض الطبية', vat_number: null, cr_number: null, address: null, configured: false },
      state: 'paid', payment: { method: 'card', last4: '4242' },
    });
    expect(r.invoice_no).toMatch(/^RCT-\d{4}-\d{6}$/);
    expect(JSON.stringify(r)).not.toMatch(/Simplified tax invoice|فاتورة ضريبية/);
  });

  it('the same booking paid the same amount is a tax invoice once a VAT number is on file: same total, VAT split, QR', async () => {
    const { svc } = world({ booking, txns, cfg: { invoice: { ...owner, vat_number: '300000000000003' } } });
    const t = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(t).toMatchObject({ document_kind: 'tax_invoice', title: { ar: 'فاتورة ضريبية مبسطة', en: 'Simplified tax invoice' }, total: 115, subtotal: 113.04, vat_rate: 0.15, vat_amount: 1.96, vat_basis: 'delivery_fee', seller: { vat_number: '300000000000003', configured: true } });
    expect(t.invoice_no).toMatch(/^INV-/);
    expectQrMatches(t);
  });

  it('a receipt is never re-labelled: after the VAT number is set the old receipt stays a receipt; a new payment gets a tax invoice', async () => {
    unregistered();
    const { svc } = world({ booking, txns });
    const first = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(first.document_kind).toBe('receipt');

    process.env.ZATCA_SELLER_NAME = 'منصة نبض الطبية';
    process.env.ZATCA_VAT_NUMBER = '300000000000003';
    const again = await svc.present(await svc.issue(patient, 'lab', 'b1')); // the same booking: the same document
    expect(again).toMatchObject({ invoice_no: first.invoice_no, document_kind: 'receipt', vat_rate: null, vat_amount: null, qr: null, subtotal: 115 });
    expect(again.seller.vat_number).toBeNull();
    expect((await svc.presentMany([again]))[0]).toMatchObject({ document_kind: 'receipt', qr: null });

    const next = await svc.present(await svc.issue(patient, 'lab', 'b2'));
    expect(next).toMatchObject({ document_kind: 'tax_invoice', vat_amount: 1.96 });
    expect(next.invoice_no).toMatch(/^INV-/);
    expectQrMatches(next);
  });

  it('a receipt picks up the legal name and CR number when they are issued later, never a VAT number or a QR', async () => {
    unregistered();
    const { svc } = world({ booking, txns });
    const first = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(first.seller).toMatchObject({ legal_name: null, cr_number: null });
    process.env.ZATCA_SELLER_NAME = 'منصة نبض الطبية';
    process.env.ZATCA_CR_NUMBER = '1010000000';
    const later = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(later).toMatchObject({ document_kind: 'receipt', seller: { legal_name: 'منصة نبض الطبية', cr_number: '1010000000', vat_number: null, configured: false }, qr: null, vat_amount: null });
  });

  it('a refund of a receipt is a refund receipt: no credit-note VAT, no QR, the state follows', async () => {
    unregistered();
    const { svc, store } = world({ booking, txns, cfg: { invoice: owner } });
    const issued = await svc.issue(patient, 'lab', 'b1');
    const note: any = await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 115, refund_ref: 'rf_1' });
    expect(note.invoice_no).toMatch(/^RRC-\d{4}-\d{6}$/);
    const inv = await svc.present(issued);
    expect(inv).toMatchObject({ state: 'refunded', refunded_total: 115 });
    expect(inv.credit_notes).toEqual([expect.objectContaining({ invoice_no: note.invoice_no, total: -115, vat_amount: null })]);
    const rr = await svc.present(store.find((d) => d.invoice_no === note.invoice_no));
    expect(rr).toMatchObject({ document_kind: 'receipt', title: { ar: 'إيصال استرداد', en: 'Refund receipt' }, total: -115, subtotal: -115, vat_rate: null, vat_amount: null, qr: null });
  });

  it('a refund of a tax invoice after the switch back is still a credit note with VAT', async () => {
    const { svc } = world({ booking, txns });
    const issued = await svc.issue(patient, 'lab', 'b1');
    const note: any = await svc.issueCreditNote({ booking_kind: 'lab', booking_id: 'b1', amount: 115, refund_ref: 'rf_1' });
    expect(note.invoice_no).toMatch(/^CN-/);
    delete process.env.ZATCA_VAT_NUMBER; // unregistered again: the documents already issued keep their kind
    expect((await svc.present(issued)).document_kind).toBe('tax_invoice');
  });

  it('a document from before the switch existed: sealed = tax invoice, unsealed (seller not configured) = receipt', async () => {
    unregistered();
    const store: any[] = [];
    const { svc } = world({ booking, txns }, store);
    const base = { booking_kind: 'lab', booking_id: 'old', patient_id: 'p1', total: 115, subtotal: 100, vat_rate: 0.15, vat_amount: 15, status: 'ISSUED', type: 'invoice', issued_at: new Date() };
    const sealed = await svc.present({ id: 'a', invoice_no: 'INV-2026-000001', ...base, seller_name: 'Co', vat_number: '300000000000003', seller_complete: true, qr_base64: 'AAAA' });
    const unsealed = await svc.present({ id: 'b', invoice_no: 'INV-2026-000002', ...base, seller_complete: false, qr_base64: null });
    expect(sealed).toMatchObject({ document_kind: 'tax_invoice', vat_amount: 15 });
    expect(unsealed).toMatchObject({ document_kind: 'receipt', vat_amount: null, vat_rate: null, subtotal: 115, qr: null });
  });

  it('the e-mail of a receipt names a receipt and the amount paid, with no VAT line', async () => {
    unregistered();
    const { svc } = world({ booking, txns, cfg: { invoice: owner } });
    const mail = { send: jest.fn(async () => ({})) } as any;
    await svc.emailInvoice(patient, 'lab', 'b1', mail);
    const [, subject, html, plain] = mail.send.mock.calls[0];
    expect(`${subject} ${html} ${plain}`).toMatch(/إيصال/);
    expect(`${subject} ${html} ${plain}`).not.toMatch(/الضريبة|فاتورة|VAT|Invoice/);
    expect(html).toContain('115.00');
  });

  const hasPdftotext = spawnSync('pdftotext', ['-v']).error === undefined;
  const text = (pdf: Buffer) => { const f = path.join(os.tmpdir(), `receipt-${process.pid}-${Date.now()}.pdf`); fs.writeFileSync(f, pdf); try { return spawnSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }).stdout; } finally { fs.unlinkSync(f); } };
  const images = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Subtype \/Image/g) ?? []).length;

  it('the receipt PDF: titled Payment receipt, no VAT line, no tax-invoice wording, no QR image, no "QR pending" warning', async () => {
    unregistered();
    const { svc } = world({ booking, txns, cfg: { invoice: owner } });
    const pdf = await svc.renderPdf(await svc.issue(patient, 'lab', 'b1'));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    const tax = await world({ booking, txns, cfg: { invoice: { ...owner, vat_number: '300000000000003' } } }).svc.renderPdf(await world({ booking, txns, cfg: { invoice: { ...owner, vat_number: '300000000000003' } } }).svc.issue(patient, 'lab', 'b1'));
    expect(images(tax)).toBeGreaterThan(images(pdf)); // the tax invoice has the ZATCA QR, the receipt does not
    if (hasPdftotext) {
      const t = text(pdf);
      expect(t).toContain('Payment receipt');
      expect(t).toContain('Total paid');
      expect(t).toContain('115.00 SAR');
      expect(t).not.toMatch(/VAT|tax invoice|Simplified|QR/i);
    }
  });

  it('the tax-invoice PDF still says tax invoice with the VAT line', async () => {
    const { svc } = world({ booking, txns });
    const pdf = await svc.renderPdf(await svc.issue(patient, 'lab', 'b1'));
    if (hasPdftotext) {
      const t = text(pdf);
      expect(t).toContain('Simplified tax invoice');
      expect(t).toMatch(/VAT on the delivery fee 15%/);
      expect(t).toContain('seller of the service');
    }
  });
});

/**
 * VAT model A (owner, 2026-11-01): the provider is the supplier of the service; the platform issues the patient's document as a third
 * party. Platform VAT is only the VAT inside the delivery fee it charges. The service price carries none.
 */
describe('VAT model A: platform VAT only on the delivery fee', () => {
  const lab = { type: 'lab', name_ar: 'مختبر الحبيب', name_en: 'Al Habib Lab', moh_license_number: 'MOH-LAB-2210' };
  const txns = [{ amount: 215, method: 'card' }];

  it('a service price of 200 and a delivery fee of 15: VAT is the 1.96 inside the fee, the service line carries none; the QR says so', async () => {
    const { svc } = world({ booking: { patient_id: 'p1', provider_account_id: 'lab-1', items: [{ name_en: 'CBC', price: 200, qty: 1 }], delivery_fee: 15 }, txns, profile: lab });
    const inv = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(inv).toMatchObject({ document_kind: 'tax_invoice', total: 215, vat_rate: 0.15, vat_amount: 1.96, subtotal: 213.04, vat_basis: 'delivery_fee' });
    expect(inv.lines.map((l: any) => [l.key, l.amount])).toEqual([['item', 200], ['delivery_fee', 15]]);
    expect(inv.provider).toMatchObject({ name_en: 'Al Habib Lab', type: 'lab' }); // the seller of the service
    expect(inv.seller.legal_name).toBe('Nabd Health Co'); // the platform, issuing as a third party
    expectQrMatches(inv);
    expect(qrOf(inv)[5]).toBe('1.96');
  });

  it('no delivery fee: no platform VAT at all (0.00), the total is the price', async () => {
    const { svc } = world({ booking: { patient_id: 'p1', items: [{ name_en: 'CBC', price: 200, qty: 1 }] }, txns: [{ amount: 200, method: 'card' }] });
    const inv = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(inv).toMatchObject({ total: 200, vat_amount: 0, subtotal: 200 });
    expect(qrOf(inv)[5]).toBe('0.00');
  });

  it('a delivery fee larger than what was paid cannot carry more VAT than the payment', async () => {
    const { svc } = world({ booking: { patient_id: 'p1', items: [{ name_en: 'x', price: 0, qty: 1 }], delivery_fee: 50 }, txns: [{ amount: 23, method: 'card' }] });
    const inv = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(inv.vat_amount).toBe(3);
    expect(inv.subtotal + inv.vat_amount).toBeCloseTo(inv.total, 2);
  });

  it('no platform VAT number: no VAT lines at all, even with a delivery fee (receipt mode applies)', async () => {
    delete process.env.ZATCA_SELLER_NAME; delete process.env.ZATCA_VAT_NUMBER;
    const { svc } = world({ booking: { patient_id: 'p1', items: [{ name_en: 'CBC', price: 200, qty: 1 }], delivery_fee: 15 }, txns });
    expect(await svc.present(await svc.issue(patient, 'lab', 'b1'))).toMatchObject({ document_kind: 'receipt', vat_rate: null, vat_amount: null, vat_basis: null, subtotal: 215, qr: null });
  });

  it('a document issued before model A keeps the VAT it was issued with and says its basis was the whole total', async () => {
    const { svc } = world({ booking: { patient_id: 'p1' }, txns });
    const legacy = await svc.present({ id: 'o', invoice_no: 'INV-2026-000009', booking_kind: 'lab', booking_id: 'old', patient_id: 'p1', total: 115, subtotal: 100, vat_rate: 0.15, vat_amount: 15, status: 'ISSUED', type: 'invoice', seller_name: 'Co', vat_number: '3', seller_complete: true, qr_base64: 'AAAA', issued_at: new Date() });
    expect(legacy).toMatchObject({ vat_amount: 15, subtotal: 100, vat_basis: 'total' });
  });
});
