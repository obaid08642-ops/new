import { parseReceipts, receiptKindOf, receiptPdfEndpoint, shareReceipt } from '../src/billing/receipts';

describe('receipts', () => {
  it('maps the app booking kinds to the kinds the invoicing service understands', () => {
    expect(receiptKindOf('consultation')).toBe('appointment');
    expect(receiptKindOf('appointment')).toBe('appointment');
    expect(receiptKindOf('LAB')).toBe('lab');
    expect(receiptKindOf('radiology')).toBe('radiology');
    expect(receiptKindOf('home_care')).toBe('nursing');
    expect(receiptKindOf('order')).toBe('pharmacy');
    expect(receiptKindOf('something_else')).toBeNull();
    expect(receiptKindOf(undefined)).toBeNull();
  });

  it('reads GET /billing/my rows, array or {data}, and drops rows it cannot draw', () => {
    const row = { invoice_no: 'INV-2026-000001', booking_kind: 'appointment', booking_id: 'b1', total: 115, vat_amount: 15, currency: 'SAR', status: 'ISSUED', createdAt: '2026-10-31T10:00:00Z' };
    for (const raw of [[row], { data: [row] }]) {
      expect(parseReceipts(raw)).toEqual([{ invoiceNo: 'INV-2026-000001', kind: 'appointment', bookingId: 'b1', total: 115, vatAmount: 15, currency: 'SAR', issuedAt: '2026-10-31T10:00:00Z', cancelled: false }]);
    }
    expect(parseReceipts([{ ...row, status: 'CANCELLED' }])[0].cancelled).toBe(true);
    expect(parseReceipts([{ ...row, invoice_no: '' }, { ...row, booking_id: 5 }, { ...row, total: 'x' }, null, 'x'])).toEqual([]);
    expect(parseReceipts(undefined)).toEqual([]);
  });

  it('downloads the PDF of that booking and opens the share sheet', async () => {
    const download = jest.fn(async () => 'file:///cache/receipt.pdf');
    const share = jest.fn(async () => undefined);
    expect(await shareReceipt('appointment', 'abcdef12-3456', { download, share })).toBe('shared');
    expect(download).toHaveBeenCalledWith('/billing/invoice/appointment/abcdef12-3456/pdf', 'receipt-abcdef12.pdf');
    expect(share).toHaveBeenCalledWith('file:///cache/receipt.pdf');
    expect(receiptPdfEndpoint('lab', 'a/b')).toBe('/billing/invoice/lab/a%2Fb/pdf');
  });

  it('says unavailable, never throws, when the server refuses or the sheet fails', async () => {
    const share = jest.fn(async () => undefined);
    expect(await shareReceipt('pharmacy', 'x', { download: async () => null, share })).toBe('unavailable');
    expect(share).not.toHaveBeenCalled();
    expect(await shareReceipt('pharmacy', 'x', { download: async () => { throw new Error('offline'); }, share })).toBe('unavailable');
    expect(await shareReceipt('pharmacy', 'x', { download: async () => 'file:///a.pdf', share: async () => { throw new Error('no sheet'); } })).toBe('unavailable');
  });

  it('every receipt key exists in all six locale files', () => {
    const keys = ['button', 'preparing', 'failTitle', 'failBody', 'title', 'loadError', 'empty', 'emptyBody', 'invoice', 'cancelled', 'kind.appointment', 'kind.lab', 'kind.radiology', 'kind.nursing', 'kind.pharmacy'];
    for (const l of ['ar', 'en', 'ur', 'hi', 'bn', 'tl']) {
      const d = require(`../src/i18n/locales/${l}.json`);
      for (const k of keys) expect(typeof d[`receipt.${k}`]).toBe('string');
      expect(typeof d['set.receipts']).toBe('string');
      expect(typeof d['set.receiptsHint']).toBe('string');
    }
  });

  it('is wired: the Settings hub row, the screen, and the appointment detail button on a paid appointment', () => {
    const fs = require('fs');
    expect(fs.readFileSync(`${__dirname}/../src/components/account/SettingsViews.tsx`, 'utf8')).toContain("go('/payments/receipts')");
    expect(fs.readFileSync(`${__dirname}/../app/payments/receipts.tsx`, 'utf8')).toContain('ReceiptsView');
    expect(fs.readFileSync(`${__dirname}/../src/components/billing/ReceiptsView.tsx`, 'utf8')).toContain("'/billing/my'");
    const detail = fs.readFileSync(`${__dirname}/../app/consultations/appointment-detail.tsx`, 'utf8');
    expect(detail).toContain("payment_status ?? '').toLowerCase() === 'paid'");
    expect(detail).toContain('<ReceiptButton bookingKind="appointment"');
  });
});
