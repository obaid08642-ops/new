import { copayRefundable } from './copay-transaction';

describe('copayRefundable (R11 P2: whole halalas)', () => {
  it('amount minus earlier refunds, exactly', () => {
    expect(copayRefundable({ amount: 50, refunded_amount: 0 })).toBe(50);
    expect(copayRefundable({ amount: 50, refunded_amount: 20 })).toBe(30);
    expect(copayRefundable({ amount: 0.3, refunded_amount: 0.1 })).toBe(0.2);      // 0.3 - 0.1 is 0.19999999999999998 on doubles
    expect(copayRefundable({ amount: 4.35, refunded_amount: 1.1 })).toBe(3.25);
  });

  it('reads the integer shadow when the row has one', () => {
    expect(copayRefundable({ amount: 12.34, amount_halalas: 1234, refunded_amount: 0, refunded_amount_halalas: 0 })).toBe(12.34);
    // a double with float drift has no clean value; its shadow is the truth
    expect(copayRefundable({ amount: 100.50000001, amount_halalas: 10050, refunded_amount_halalas: 50 })).toBe(100);
    // only one of the two has a shadow: each side falls back on its own
    expect(copayRefundable({ amount: 10, amount_halalas: 1000, refunded_amount: 2.5 })).toBe(7.5);
  });

  it('never goes below zero (over-refunded or negative figures)', () => {
    expect(copayRefundable({ amount: 10, refunded_amount: 12 })).toBe(0);
    expect(copayRefundable({ amount: -5, refunded_amount: 0 })).toBe(0);
  });

  it('a missing transaction or missing figures is zero, and a non-finite figure does not throw', () => {
    expect(copayRefundable(null)).toBe(0);
    expect(copayRefundable(undefined)).toBe(0);
    expect(copayRefundable({})).toBe(0);
    expect(copayRefundable({ amount: NaN, refunded_amount: 1 })).toBe(0);
    expect(copayRefundable({ amount: Infinity })).toBe(0);
  });

  it('a half halala rounds away from zero on the decimal text (same rule as toHalalas)', () => {
    expect(copayRefundable({ amount: 1.005, refunded_amount: 0 })).toBe(1.01);
  });
});
