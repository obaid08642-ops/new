import { refundableLeftSar } from './refundable-left';

describe('refundableLeftSar (R11 P2 read path)', () => {
  it('subtracts whole halalas from the shadows', () => {
    expect(refundableLeftSar({ amount_halalas: 10000, refunded_amount_halalas: 3333 })).toBe(66.67);
  });
  it('shadows win over the doubles when both are present', () => {
    expect(refundableLeftSar({ amount: 100, amount_halalas: 9999, refunded_amount: 0, refunded_amount_halalas: 0 })).toBe(99.99);
  });
  it('falls back to the doubles per field when a shadow is missing', () => {
    expect(refundableLeftSar({ amount: 100, refunded_amount: 0.1 + 0.2 })).toBe(99.7);
    expect(refundableLeftSar({ amount_halalas: 5000, refunded_amount: 12.5 })).toBe(37.5);
    expect(refundableLeftSar({ amount: 80, refunded_amount_halalas: 1000 })).toBe(70);
  });
  it('a never-refunded row (no refunded_amount at all) leaves the whole amount', () => {
    expect(refundableLeftSar({ amount: 49.9 })).toBe(49.9);
    expect(refundableLeftSar({ amount_halalas: 4990 })).toBe(49.9);
  });
  it('never goes below zero and ignores garbage', () => {
    expect(refundableLeftSar({ amount_halalas: 1000, refunded_amount_halalas: 1500 })).toBe(0);
    expect(refundableLeftSar({ amount: 'x', refunded_amount: null })).toBe(0);
    expect(refundableLeftSar(null)).toBe(0);
    expect(refundableLeftSar({ amount_halalas: 1.5, amount: 2 })).toBe(2);
  });
  it('removes the double-subtraction drift the old code relied on rounding for', () => {
    expect(refundableLeftSar({ amount_halalas: 30, refunded_amount_halalas: 10 })).toBe(0.2);
  });
});
