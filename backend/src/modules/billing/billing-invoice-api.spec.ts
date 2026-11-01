import { BillingService, decodeTlv } from './billing.module';

/**
 * GET /billing/invoice/:kind/:id: what the receipt screens may show, every figure stored from the payment and the booking when the
 * invoice was issued. Cash, card, insured and refunded invoices; the seller fields come from config and are never invented.
 */
type World = { booking: any; txns?: any[]; copayTxn?: any; cfg?: Record<string, any> };

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
    expect(inv).toMatchObject({ type: 'invoice', total: 150, vat_amount: 19.57, subtotal: 130.43, discount: 0, insured: null, state: 'paid', refunded_total: 0, credit_notes: [] });
    expect(inv.lines).toEqual([{ key: 'item', name_ar: 'سكر', name_en: 'Glucose', qty: 1, unit_price: 150, amount: 150 }]);
    expect(inv.payment).toEqual({ method: 'cash', last4: null });
    expect(inv.seller).toEqual({ legal_name: 'Nabd Health Co', vat_number: '300000000000003', configured: true });
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
    expect(inv).toMatchObject({ discount: 10, total: 140, vat_amount: 18.26, subtotal: 121.74 });
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
  const booking = { patient_id: 'p1', payment_method: 'card', items: [{ name_en: 'CBC', price: 115, qty: 1 }] };
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
    expect(inv.credit_notes).toEqual([expect.objectContaining({ invoice_no: note.invoice_no, total: -115, vat_amount: -15 })]);
    const cn = await svc.present(store.find((d) => d.invoice_no === note.invoice_no));
    expect(cn).toMatchObject({ state: 'credit_note', type: 'credit_note', original_invoice_no: inv.invoice_no, total: -115 });
    expect(qrOf(cn)[4]).toBe('-115.00');
    expect(qrOf(cn)[5]).toBe('-15.00');
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
  it('empty config: issued, says so, no QR, nothing invented; sealed with the original time once the owner fills it in', async () => {
    delete process.env.ZATCA_SELLER_NAME;
    delete process.env.ZATCA_VAT_NUMBER;
    const { svc } = world({ booking: { patient_id: 'p1', items: [{ name_en: 'CBC', price: 115, qty: 1 }] }, txns: [{ amount: 115, method: 'card' }] });
    const first = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(first).toMatchObject({ seller: { legal_name: null, vat_number: null, configured: false }, qr: null, total: 115 });
    expect(first.seller_name == null && first.vat_number == null).toBe(true);

    process.env.ZATCA_SELLER_NAME = 'Nabd Health Co';
    process.env.ZATCA_VAT_NUMBER = '300000000000003';
    const sealed = await svc.present(await svc.issue(patient, 'lab', 'b1'));
    expect(sealed.seller).toEqual({ legal_name: 'Nabd Health Co', vat_number: '300000000000003', configured: true });
    expect(qrOf(sealed)[3]).toBe(new Date(first.issued_at).toISOString()); // the time of issue, not of sealing
    expectQrMatches(sealed);
  });

  it('finance_config wins over the environment', async () => {
    const { svc } = world({ booking: { patient_id: 'p1' }, txns: [{ amount: 23, method: 'card' }], cfg: { invoice: { seller_name: 'Config Co', vat_number: '311111111100003' } } });
    expect((await svc.present(await svc.issue(patient, 'lab', 'b1'))).seller).toEqual({ legal_name: 'Config Co', vat_number: '311111111100003', configured: true });
  });
});

describe('the PDF', () => {
  it('says the seller is not configured instead of printing a made-up one', async () => {
    delete process.env.ZATCA_SELLER_NAME;
    delete process.env.ZATCA_VAT_NUMBER;
    const { svc } = world({ booking: { patient_id: 'p1' }, txns: [{ amount: 23, method: 'card' }] });
    const pdf = await svc.renderPdf(await svc.issue(patient, 'lab', 'b1'));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
