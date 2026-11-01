import { receiptKindOf } from '../src/billing/receipts';

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
});
