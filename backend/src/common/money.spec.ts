import { MoneyError, allocate, formatSar, fromHalalas, isCleanSar, percentOf, rateOf, sumHalalas, toHalalas } from './money';

describe('toHalalas / fromHalalas', () => {
  it.each([[0, 0], [12.34, 1234], [0.1, 10], [0.07, 7], [19.99, 1999], [1e6 + 0.01, 100000001], [-5.5, -550]])('%p SAR is %p halalas', (sar, h) => {
    expect(toHalalas(sar)).toBe(h);
  });

  it('rounds on the decimal text, half away from zero: the cases where Math.round(x * 100) is wrong', () => {
    expect(Math.round(1.005 * 100)).toBe(100);          // the float answer this replaces
    expect(toHalalas(1.005)).toBe(101);
    expect(toHalalas(8.345)).toBe(835);
    expect(toHalalas(1.255)).toBe(126);
    expect(toHalalas('0.005')).toBe(1);
    expect(toHalalas('-0.005')).toBe(-1);
    expect(toHalalas('0.004')).toBe(0);
    expect(toHalalas(4.35)).toBe(435);                  // 4.35 * 100 === 434.99999999999994
  });

  it('sums that drift in doubles are exact in halalas', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumHalalas([toHalalas(0.1), toHalalas(0.2)])).toBe(toHalalas(0.3));
    const cents = Array.from({ length: 1000 }, () => toHalalas(0.1));
    expect(sumHalalas(cents)).toBe(10000);
    let d = 0; for (let i = 0; i < 1000; i++) d += 0.1;
    expect(d).not.toBe(100);
  });

  it('round-trips a million random amounts', () => {
    for (let i = 0; i < 1_000_000; i++) {
      const h = Math.floor(Math.random() * 1e11) * (i % 7 === 0 ? -1 : 1);
      expect(toHalalas(fromHalalas(h))).toBe(h);
    }
  });

  it('refuses what is not money', () => {
    for (const bad of [NaN, Infinity, -Infinity, '', 'abc', '1,5', '1e3', '12.', 1e300]) expect(() => toHalalas(bad as any)).toThrow(MoneyError);
    expect(() => fromHalalas(1.5)).toThrow(MoneyError);
    expect(() => sumHalalas([Number.MAX_SAFE_INTEGER, 1])).toThrow(MoneyError);
    expect(Object.is(toHalalas(-0.001), 0)).toBe(true);   // never -0
  });
});

describe('formatSar', () => {
  it.each([[1234, '12.34'], [5, '0.05'], [0, '0.00'], [-5, '-0.05'], [100000, '1000.00']])('%p -> %p', (h, s) => expect(formatSar(h)).toBe(s));
});

describe('rateOf / percentOf', () => {
  it('computes shares exactly and rounds half away from zero', () => {
    expect(rateOf(1000, 15, 100)).toBe(150);
    expect(rateOf(1, 1, 2)).toBe(1);        // 0.5 halala -> 1
    expect(rateOf(-1, 1, 2)).toBe(-1);
    expect(rateOf(3, 1, 3)).toBe(1);
    expect(rateOf(Number.MAX_SAFE_INTEGER, 1, 1)).toBe(Number.MAX_SAFE_INTEGER);   // BigInt: no overflow in the product
  });
  it('percentOf accepts decimals with up to 4 places and VAT 15 %', () => {
    expect(percentOf(10000, 15)).toBe(1500);
    expect(percentOf(10000, '5.25')).toBe(525);
    expect(percentOf(333, '15')).toBe(50);                 // 49.95 -> 50
    expect(() => percentOf(100, '1.23456')).toThrow(MoneyError);
    expect(() => percentOf(100, -1)).toThrow(MoneyError);
  });
});

describe('allocate', () => {
  it('always adds up to the total', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(5, [1, 0, 1])).toEqual([3, 0, 2]);
    expect(allocate(-100, [1, 1, 1])).toEqual([-34, -33, -33]);
    for (let i = 0; i < 20_000; i++) {
      const total = Math.floor(Math.random() * 1e8) - 5e7;
      const w = Array.from({ length: 1 + (i % 6) }, () => Math.floor(Math.random() * 1000) + (i % 2));
      if (w.every((x) => x === 0)) continue;
      const parts = allocate(total, w);
      expect(sumHalalas(parts)).toBe(total);
      const sumW = w.reduce((a, b) => a + b, 0);
      parts.forEach((p, k) => expect(Math.abs(p - (total * w[k]) / sumW)).toBeLessThan(1));   // each part within one halala of its exact share
    }
  });
  it('refuses empty or zero weights', () => {
    expect(() => allocate(100, [])).toThrow(MoneyError);
    expect(() => allocate(100, [0, 0])).toThrow(MoneyError);
    expect(() => allocate(100, [-1, 2])).toThrow(MoneyError);
  });
});

describe('isCleanSar', () => {
  it('flags drifted legacy doubles', () => {
    expect(isCleanSar(12.34)).toBe(true);
    expect(isCleanSar(0.1 + 0.2)).toBe(false);
    expect(isCleanSar(10.005)).toBe(false);
    expect(isCleanSar(NaN)).toBe(false);
    expect(isCleanSar('12')).toBe(false);
  });
});
