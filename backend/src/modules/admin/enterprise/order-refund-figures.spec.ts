import { orderRefundFigures } from './order-refund-figures';

describe('orderRefundFigures (R11 P2 read path)', () => {
  it('adds the shadows in whole halalas', () => {
    const f = orderRefundFigures([{ amount_halalas: 1010 }, { amount_halalas: 2020 }], [{ amount_halalas: 1010 }], null, false);
    expect([f.paid, f.refunded, f.maxRefundable, f.ceiling]).toEqual([30.3, 10.1, 20.2, 20.2]);
  });
  it('falls back to the double per row when a shadow is missing', () => {
    const f = orderRefundFigures([{ amount: 0.1 }, { amount: 0.2 }], [], null, false);
    expect(f.paid).toBe(0.3);
    expect(f.paidHalalas).toBe(30);
  });
  it('a cancellation share caps a full refund at pct of paid minus already refunded', () => {
    const f = orderRefundFigures([{ amount_halalas: 20000 }], [{ amount_halalas: 2000 }], 50, false);
    expect(f.maxRefundable).toBe(180);
    expect(f.ceiling).toBe(80);
  });
  it('an override reason lifts the share cap back to the net paid', () => {
    expect(orderRefundFigures([{ amount_halalas: 20000 }], [], 50, true).ceiling).toBe(200);
  });
  it('rounds the share on integers: 33 % of 10.01 SAR is 3.30', () => {
    expect(orderRefundFigures([{ amount_halalas: 1001 }], [], 33, false).ceiling).toBe(3.3);
  });
  it('never a negative ceiling, even when more was refunded than the share', () => {
    const f = orderRefundFigures([{ amount_halalas: 10000 }], [{ amount_halalas: 9000 }], 50, false);
    expect(f.ceiling).toBe(0);
    expect(f.maxRefundable).toBe(10);
  });
  it('no payments: everything zero', () => {
    expect(orderRefundFigures([], [], null, false).paidHalalas).toBe(0);
  });
});
