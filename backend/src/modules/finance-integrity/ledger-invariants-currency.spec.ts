/** Money step M4: the order invariants run in the order's ONE currency; two currencies on one order are a finding, never a sum. Pure. */
import { checkOrder, LedgerRow, PaymentRow } from './ledger-invariants';

const pay = (over: Partial<PaymentRow> = {}): PaymentRow => ({ kind: 'transaction', id: 't1', status: 'paid', amount: 100, ...over });
const refundRow = (amount: number): LedgerRow => ({ id: 'r1', type: 'refund', amount, ref_type: 'refund', ref_id: 'rf1', ...({ meta: { method: 'gateway' } } as any) });
const codes = (f: Array<{ code: string }>) => f.map((x) => x.code);

describe('checkOrder by currency', () => {
  it('SAR order (no currency on the rows): same findings as before, a refund above the paid amount is refund_exceeds_paid', () => {
    const f = checkOrder({ order_id: 'o', ledger: [refundRow(120)], earnings: [], payments: [pay({ refunded_amount: 120 })] });
    expect(codes(f)).toContain('refund_exceeds_paid');
  });

  it('BHD order: 3-digit amounts are clean, no false ledger_amount_unclean, minor units compared in fils', () => {
    const ok = checkOrder({ order_id: 'o', ledger: [{ ...refundRow(2.5), currency: 'BHD' }], earnings: [], payments: [pay({ currency: 'BHD', amount: 12.345, refunded_amount: 2.5, amount_minor: 12345, refunded_amount_minor: 2500 })] });
    expect(ok).toEqual([]);
    const over = checkOrder({ order_id: 'o', ledger: [{ ...refundRow(12.346), currency: 'BHD' }], earnings: [], payments: [pay({ currency: 'BHD', amount: 12.345, refunded_amount: 12.346 })] });
    expect(codes(over)).toContain('refund_exceeds_paid');      // one fils over
  });

  it('BHD amount with 4 decimals is unclean in BHD', () => {
    const f = checkOrder({ order_id: 'o', ledger: [{ ...refundRow(1.2345), currency: 'BHD' }], earnings: [], payments: [pay({ currency: 'BHD', amount: 5, refunded_amount: 1.2345 })] });
    expect(codes(f)).toContain('ledger_amount_unclean');
  });

  it('a payment whose _minor is not the minor units of its amount is payment_minor_mismatch', () => {
    const f = checkOrder({ order_id: 'o', ledger: [], earnings: [], payments: [pay({ currency: 'BHD', amount: 12.345, amount_minor: 1234 })] });
    expect(f.find((x) => x.code === 'payment_minor_mismatch')?.detail).toMatchObject({ field: 'amount', value: 12.345, shadow: 1234, currency: 'BHD' });
  });

  it('SAR payment with a matching _minor and _halalas is clean; with a wrong _minor it is flagged', () => {
    expect(checkOrder({ order_id: 'o', ledger: [], earnings: [], payments: [pay({ amount: 10.5, amount_minor: 1050, amount_halalas: 1050 })] })).toEqual([]);
    expect(codes(checkOrder({ order_id: 'o', ledger: [], earnings: [], payments: [pay({ amount: 10.5, amount_minor: 1051 })] }))).toEqual(['payment_minor_mismatch']);
  });

  it('a BHD payment does not need (and is not checked for) halalas', () => {
    expect(checkOrder({ order_id: 'o', ledger: [], earnings: [], payments: [pay({ currency: 'BHD', amount: 1.234, amount_minor: 1234, amount_halalas: 999 })] })).toEqual([]);
  });

  it('payments of two currencies on one order: order_currency_mismatch, and nothing is added up across them', () => {
    const f = checkOrder({ order_id: 'o', ledger: [refundRow(500)], earnings: [], payments: [pay({ id: 'a', currency: 'SAR', amount: 10 }), pay({ id: 'b', currency: 'BHD', amount: 10 })] });
    expect(f).toHaveLength(1);
    expect(f[0].code).toBe('order_currency_mismatch');
    expect(f[0].detail.currencies).toEqual(['SAR', 'BHD']);
  });

  it('a row with no currency and a row with SAR are the same currency (every existing row is SAR)', () => {
    const f = checkOrder({ order_id: 'o', ledger: [], earnings: [], payments: [pay({ id: 'a', amount: 10 }), pay({ id: 'b', currency: 'SAR', amount: 10 })] });
    expect(codes(f)).not.toContain('order_currency_mismatch');
  });

  it('M5b: a cash order (no payment row) is read in its ledger rows\' currency: BHD 3 digits are clean', () => {
    const f = checkOrder({ order_id: 'o', ledger: [{ ...refundRow(2.345), currency: 'BHD', amount_minor: 2345 }], earnings: [{ id: 'e1', type: 'provider_earning', amount: 10.125, currency: 'BHD', amount_minor: 10125 } as LedgerRow], payments: [] });
    expect(f).toEqual([]);
  });

  it('M5b: a ledger row of another currency than the payments is order_currency_mismatch', () => {
    const f = checkOrder({ order_id: 'o', ledger: [{ ...refundRow(5), currency: 'BHD' }], earnings: [], payments: [pay({ currency: 'SAR', amount: 50 })] });
    expect(codes(f)).toEqual(['order_currency_mismatch']);
  });

  it('M5b: a ledger row whose _minor is not the minor units of its amount is ledger_minor_mismatch', () => {
    const f = checkOrder({ order_id: 'o', ledger: [{ ...refundRow(2.345), currency: 'BHD', amount_minor: 2340 }], earnings: [], payments: [] });
    expect(f.find((x) => x.code === 'ledger_minor_mismatch')?.detail).toMatchObject({ field: 'amount', value: 2.345, shadow: 2340, currency: 'BHD' });
  });

  it('M5b: a SAR ledger row with no currency and a matching _minor is clean', () => {
    expect(checkOrder({ order_id: 'o', ledger: [{ ...refundRow(10.5), amount_minor: 1050 }], earnings: [], payments: [pay({ amount: 100, refunded_amount: 10.5 })] })).toEqual([]);
  });
});
