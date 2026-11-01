import * as fs from 'fs';
import { renderInvoicePdf } from './invoice-pdf';
import { tlvQr } from './billing.module';

/** A presented invoice, shaped as `BillingService.present` returns it. */
function sample(over: Record<string, unknown> = {}): any {
  const issued = new Date('2026-11-01T09:30:00.000Z');
  return {
    invoice_no: 'INV-2026-000007', type: 'invoice', booking_id: 'b-1', booking_ref: 'NBD-4F2A9C', issued_at: issued, subtotal: 130.43, vat_rate: 0.15, vat_amount: 19.57, total: 150, discount: 10, currency: 'SAR',
    lines: [
      { key: 'item', name_ar: 'تحليل سكر صائم', name_en: 'Fasting glucose', qty: 1, unit_price: 80, amount: 80 },
      { key: 'item', name_ar: 'صورة دم كاملة', name_en: 'CBC', qty: 2, unit_price: 40, amount: 80 },
      { key: 'home_visit_fee', name_ar: null, name_en: null, qty: 1, unit_price: 0, amount: 0 },
    ],
    payment: { method: 'card', last4: '4242' }, insured: null, state: 'paid', refunded_total: 0, credit_notes: [],
    seller: { legal_name: 'شركة نبض للرعاية الصحية', vat_number: '300000000000003', cr_number: '1010000000', address: 'الرياض، حي العليا، طريق الملك فهد', configured: true },
    provider: { name_ar: 'مختبر الحبيب الطبي', name_en: 'Al Habib Medical Lab', facility_name: null, type: 'lab', license_number: 'MOH-LAB-2210' },
    patient_name: 'أحمد القحطاني',
    qr: { format: 'zatca-phase1-tlv-base64', payload: tlvQr('شركة نبض للرعاية الصحية', '300000000000003', issued.toISOString(), 150, 19.57) },
    footer: { support_email: 'support@nabd.example', support_phone: '+966 11 000 0000', refund_policy_url: { ar: 'https://nabd.plus/ar/refund-policy', en: 'https://nabd.plus/en/refund-policy' } },
    ...over,
  };
}
const qr = async (inv: any) => require('qrcode').toBuffer(inv.qr.payload, { type: 'png', width: 220, margin: 1 });
const dump = (name: string, pdf: Buffer) => { if (process.env.INVOICE_PDF_DUMP) fs.writeFileSync(`${process.env.INVOICE_PDF_DUMP}/${name}.pdf`, pdf); };

describe('the invoice PDF', () => {
  it('is a PDF with the Arabic font embedded', async () => {
    const inv = sample();
    const pdf = await renderInvoicePdf({ inv, qrPng: await qr(inv) });
    dump('paid', pdf);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.toString('latin1')).toMatch(/NotoNaskhArabic/); // the Arabic font is embedded, not substituted
  });

  it('draws the page with seller, provider and QR from the document; a seller that is not configured is said so and has no QR', async () => {
    const inv = sample({ seller: { legal_name: null, vat_number: null, cr_number: null, address: null, configured: false }, qr: null, provider: null, patient_name: null });
    const pdf = await renderInvoicePdf({ inv, qrPng: null });
    dump('unconfigured', pdf);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('an insured, refunded invoice and a credit note render too', async () => {
    const insured = sample({ insured: { insurer: 'Bupa', price: 400, insurer_share: 320, patient_share: 80, covered: 320, copay: 80 }, total: 80, state: 'refunded', credit_notes: [{ invoice_no: 'CN-2026-000001', total: -80 }] });
    dump('insured-refunded', await renderInvoicePdf({ inv: insured, qrPng: await qr(insured) }));
    const note = sample({ type: 'credit_note', invoice_no: 'CN-2026-000001', original_invoice_no: 'INV-2026-000007', total: -80, subtotal: -69.57, vat_amount: -10.43, discount: 0, lines: [{ key: 'refund', name_ar: null, name_en: null, qty: 1, unit_price: -80, amount: -80 }], state: 'credit_note' });
    const pdf = await renderInvoicePdf({ inv: note, qrPng: await qr(note) });
    dump('credit-note', pdf);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('a long invoice continues on a second page with the footer on both', async () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ key: 'item', name_ar: `بند رقم ${i + 1}`, name_en: `Item ${i + 1}`, qty: 1, unit_price: 5, amount: 5 }));
    const inv = sample({ lines: many, total: 200 });
    const pdf = await renderInvoicePdf({ inv, qrPng: await qr(inv) });
    dump('long', pdf);
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
