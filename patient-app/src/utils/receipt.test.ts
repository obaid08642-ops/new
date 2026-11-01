import { decodeZatcaTlv, extractReceipt, extractReceipts, isReceiptKind } from './receipt';

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
