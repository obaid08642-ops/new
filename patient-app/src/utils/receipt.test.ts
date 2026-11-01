import { decodeZatcaTlv, extractReceipt, extractReceipts, isReceiptKind, extractNewShareLink, extractShareLinks, providerName, sharedPageUrl } from './receipt';

// the backend's encoder (backend/src/modules/billing/billing.module.ts tlvQr), repeated so the test pins the wire format
function tlvQr(seller: string, vat: string, iso: string, total: number, vatAmount: number): string {
  const tlv = (tag: number, value: string) => {
    const bytes = Array.from(Buffer.from(value, 'utf8'));
    return [tag, bytes.length, ...bytes];
  };
  return Buffer.from([...tlv(1, seller), ...tlv(2, vat), ...tlv(3, iso), ...tlv(4, total.toFixed(2)), ...tlv(5, vatAmount.toFixed(2))]).toString('base64');
}

describe('decodeZatcaTlv', () => {
  it('reads the five phase-1 tags, Arabic seller name included', () => {
    const qr = tlvQr('منصة نَبْض للرعاية الصحية', '300000000000003', '2026-10-31T10:00:00.000Z', 115, 15);
    expect(decodeZatcaTlv(qr)).toEqual({ seller: 'منصة نَبْض للرعاية الصحية', vatNumber: '300000000000003', issuedAt: '2026-10-31T10:00:00.000Z', total: 115, vat: 15 });
  });
  it('is null for text that is not a phase-1 payload', () => {
    expect(decodeZatcaTlv('not base64!!')).toBeNull();
    expect(decodeZatcaTlv('')).toBeNull();
    expect(decodeZatcaTlv(undefined)).toBeNull();
    expect(decodeZatcaTlv(Buffer.from([1, 9, 97, 98, 99]).toString('base64'))).toBeNull();
  });
});

describe('extractReceipt', () => {
  const base = { invoice_no: 'INV-2026-000001', booking_kind: 'lab', booking_id: 'b1', subtotal: 100, vat_rate: 0.15, vat_amount: 15, total: 115, currency: 'SAR', qr_base64: tlvQr('Nabd', '300000000000003', '2026-10-31T10:00:00.000Z', 115, 15), createdAt: '2026-10-31T10:00:01.000Z' };
  it('takes the amounts as sent and the time and seller from the QR', () => {
    expect(extractReceipt(base)).toMatchObject({ invoiceNo: 'INV-2026-000001', total: 115, issuedAt: '2026-10-31T10:00:00.000Z' });
  });
  it('falls back to createdAt and no seller without a QR', () => {
    expect(extractReceipt({ ...base, qr_base64: undefined })).toMatchObject({ issuedAt: '2026-10-31T10:00:01.000Z', seller: null, qr: null });
  });
  it('marks a cancelled invoice', () => {
    expect(extractReceipt({ ...base, status: 'CANCELLED' })?.cancelled).toBe(true);
    expect(extractReceipt({ ...base, status: 'ISSUED' })?.cancelled).toBe(false);
  });
  it('drops an invoice without its number, booking or an amount', () => {
    expect(extractReceipt({ ...base, invoice_no: '' })).toBeNull();
    expect(extractReceipt({ ...base, total: undefined })).toBeNull();
    expect(extractReceipt(null)).toBeNull();
  });
  it('reads a list, bare or under data', () => {
    expect(extractReceipts([base, { nope: 1 }])).toHaveLength(1);
    expect(extractReceipts({ data: [base] })).toHaveLength(1);
    expect(extractReceipts('x')).toEqual([]);
  });
  it('knows the kinds the backend invoices', () => {
    expect(isReceiptKind('home_care')).toBe(true);
    expect(isReceiptKind('../x')).toBe(false);
  });
});

describe('the invoice content', () => {
  const base = { invoice_no: 'INV-2026-000002', booking_kind: 'appointment', booking_id: 'b2', subtotal: 100, vat_rate: 0.15, vat_amount: 15, total: 115, currency: 'SAR', issued_at: '2026-10-31T10:00:00.000Z' };
  it('reads the company, the provider, the booking number, the state and the credit notes', () => {
    const view = extractReceipt({
      ...base, type: 'invoice', state: 'partially_refunded', refunded_total: 20, booking_ref: 'AB12CD34',
      seller: { legal_name: 'Nabd', vat_number: '300000000000003', cr_number: '1010', address: 'Riyadh', configured: true },
      provider: { name_ar: 'د. سارة', name_en: 'Dr Sara', facility_name: null, type: 'doctor', license_number: 'SC-1' },
      credit_notes: [{ invoice_no: 'CN-2026-000001', total: -20, vat_amount: -2.61, issued_at: '2026-11-01T09:00:00.000Z' }, { total: 1 }],
    });
    expect(view).toMatchObject({ state: 'partially_refunded', refundedTotal: 20, bookingRef: 'AB12CD34', issuedAt: '2026-10-31T10:00:00.000Z' });
    expect(view?.company).toEqual({ legalName: 'Nabd', vatNumber: '300000000000003', crNumber: '1010', address: 'Riyadh', configured: true });
    expect(view?.provider).toEqual({ nameAr: 'د. سارة', nameEn: 'Dr Sara', facility: null, type: 'doctor', licence: 'SC-1' });
    expect(view?.creditNotes).toEqual([{ invoiceNo: 'CN-2026-000001', total: -20, vatAmount: -2.61, issuedAt: '2026-11-01T09:00:00.000Z' }]);
  });
  it('keeps "not configured" as null fields and invents nothing', () => {
    const view = extractReceipt({ ...base, seller: { legal_name: null, vat_number: null, cr_number: null, address: null, configured: false }, provider: null });
    expect(view?.company).toEqual({ legalName: null, vatNumber: null, crNumber: null, address: null, configured: false });
    expect(view?.provider).toBeNull();
    expect(view?.bookingRef).toBeNull();
  });
  it('names the provider in Arabic for ar and ur, English otherwise', () => {
    const provider = { nameAr: 'د. سارة', nameEn: 'Dr Sara', facility: 'Clinic', type: 'doctor', licence: null };
    expect(providerName(provider, 'ar')).toBe('د. سارة');
    expect(providerName(provider, 'ur')).toBe('د. سارة');
    expect(providerName(provider, 'hi')).toBe('Dr Sara');
    expect(providerName({ ...provider, nameAr: null, nameEn: null }, 'en')).toBe('Clinic');
  });
});

describe('share links', () => {
  it('lists links without a token and drops rows it cannot read', () => {
    expect(extractShareLinks([{ id: 'l1', status: 'active', created_at: 'a', expires_at: 'b', view_count: 3, token: 'never' }, { id: 'l2', status: 'weird' }, { status: 'active' }])).toEqual([{ id: 'l1', status: 'active', createdAt: 'a', expiresAt: 'b', viewCount: 3 }]);
  });
  it('needs the token of a new link, and opens the web page in the reader language, never the API', () => {
    expect(extractNewShareLink({ id: 'l1', token: 'tok', expires_at: 'x', url: 'https://api/x' })).toEqual({ id: 'l1', token: 'tok', expiresAt: 'x' });
    expect(extractNewShareLink({ id: 'l1' })).toBeNull();
    expect(sharedPageUrl('ur', 'tok_en-1')).toBe('https://nabd.plus/ur/receipt/shared/tok_en-1');
  });
});
