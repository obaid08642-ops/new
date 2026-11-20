import { CURRENCY_EXPONENTS, currencyExponent, isKnownCurrency } from './currency';
import { CURRENCY_EXPONENTS as FROM_MARKETS } from '../modules/markets/market-config.validate';
import { MoneyError, allocate, formatSar, fromHalalas, isCleanSar, percentOf, rateOf, sumHalalas, toHalalas } from './money';
import { allocateMinor, formatMoney, fromMinor, isCleanAmount, money, percentOfMinor, rateOfMinor, sumMinor, toMinor } from './money-minor';

/** Both calls give the same number, or both throw. */
const same = (a: () => number, b: () => number) => {
  let ra: unknown; let rb: unknown; let ea = false; let eb = false;
  try { ra = a(); } catch { ea = true; }
  try { rb = b(); } catch { eb = true; }
  expect(ea).toBe(eb);
  if (!ea) expect(ra).toBe(rb);
};

describe('the one currency table (blueprint section 5)', () => {
  it('has the exponents of ISO 4217 for the currencies we expect, and the market validator reads the same table', () => {
    expect(CURRENCY_EXPONENTS).toMatchObject({ SAR: 2, EGP: 2, AED: 2, USD: 2, EUR: 2, JOD: 3, BHD: 3, KWD: 3, OMR: 3, JPY: 0 });
    expect(FROM_MARKETS).toBe(CURRENCY_EXPONENTS);
  });
  it('an unknown or lower-case code is refused, never guessed as 2 digits', () => {
    expect(isKnownCurrency('SAR')).toBe(true);
    for (const bad of ['sar', 'XXX', '', undefined, null, 5, 'toString', '__proto__']) expect(isKnownCurrency(bad)).toBe(false);
    expect(() => currencyExponent('XXX')).toThrow('unknown_currency');
    expect(() => toMinor(1, 'XXX')).toThrow(MoneyError);
  });
});

describe('SAR through the minor-unit helpers is identical to the halala helpers (Saudi bytes do not change)', () => {
  const NUMBERS = [0, 1, 12.34, 0.1 + 0.2, 1.005, 1.015, 2.675, -5.5, -0.005, 0.005, 0.004, 99999999.99, 1e-9, 123456.789, 0.5, 0.05, 100, -0, 1e15, 9007199254740.99, NaN, Infinity];
  const TEXTS = ['12.345', '-12.345', '0.005', '0.004', '999.995', ' 7 ', '1e3', 'abc', '12.', '.5', '', '+3.10', '-0', '0.0049999', '12.3456789012'];

  it('toMinor equals toHalalas for numbers and decimal text, and both throw on the same inputs', () => {
    for (const x of NUMBERS) same(() => toMinor(x, 'SAR'), () => toHalalas(x));
    for (const x of TEXTS) same(() => toMinor(x, 'SAR'), () => toHalalas(x));
  });

  it('toMinor equals toHalalas over 20000 seeded random amounts with 0 to 4 decimals', () => {
    let seed = 20261120;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    for (let i = 0; i < 20000; i++) {
      const decimals = Math.floor(rnd() * 5);
      const x = Math.round((rnd() * 2 - 0.2) * 1e6 * 10 ** decimals) / 10 ** decimals / 100;
      same(() => toMinor(x, 'SAR'), () => toHalalas(x));
      same(() => toMinor(String(x), 'SAR'), () => toHalalas(String(x)));
    }
  });

  it('fromMinor, formatMoney and isCleanAmount equal fromHalalas, formatSar and isCleanSar', () => {
    for (const h of [0, 1, 5, 99, 100, 1234, -1, -5, -1234, 999999999, 4503599627370495]) {
      expect(fromMinor(h, 'SAR')).toBe(fromHalalas(h));
      expect(formatMoney(h, 'SAR')).toBe(formatSar(h));
    }
    for (const x of [...NUMBERS, 12.34, 0.30000000000000004]) expect(isCleanAmount(x, 'SAR')).toBe(isCleanSar(x));
  });

  it('sum, rate, percent and allocation of SAR amounts equal the halala results', () => {
    const vals = [1234, 5, 99, 100000];
    expect(sumMinor(vals.map((v) => money(v, 'SAR')))).toEqual({ amount_minor: sumHalalas(vals), currency: 'SAR' });
    expect(rateOfMinor(money(1000, 'SAR'), 15, 100).amount_minor).toBe(rateOf(1000, 15, 100));
    expect(rateOfMinor(money(-1001, 'SAR'), 1, 2).amount_minor).toBe(rateOf(-1001, 1, 2));
    expect(percentOfMinor(money(12345, 'SAR'), '5.25').amount_minor).toBe(percentOf(12345, '5.25'));
    expect(allocateMinor(money(100, 'SAR'), [1, 1, 1]).map((p) => p.amount_minor)).toEqual(allocate(100, [1, 1, 1]));
    expect(allocateMinor(money(-7, 'SAR'), [3, 1]).map((p) => p.amount_minor)).toEqual(allocate(-7, [3, 1]));
  });
});

describe('a 3-decimal currency (BHD, KWD, OMR, JOD) and a 0-decimal one (JPY)', () => {
  it('BHD: 1.234 is 1234 fils, rounding is half away from zero on the 4th decimal, text and numbers agree', () => {
    expect(toMinor(1.234, 'BHD')).toBe(1234);
    expect(toMinor('1.2345', 'BHD')).toBe(1235);
    expect(toMinor('-1.2345', 'BHD')).toBe(-1235);
    expect(toMinor('1.2344', 'BHD')).toBe(1234);
    expect(toMinor(0.1 + 0.2, 'BHD')).toBe(300);          // float drift does not leak into the third decimal
    expect(toMinor(1.0005, 'BHD')).toBe(1001);
    expect(toMinor(5, 'KWD')).toBe(5000);
    expect(toMinor('0.001', 'OMR')).toBe(1);
  });
  it('BHD: display and the double round trip are exact, a SAR-clean value is not necessarily BHD-clean and the other way round', () => {
    expect(formatMoney(1234, 'BHD')).toBe('1.234');
    expect(formatMoney(5, 'BHD')).toBe('0.005');
    expect(formatMoney(-5, 'BHD')).toBe('-0.005');
    expect(formatMoney(1000, 'BHD')).toBe('1.000');
    expect(fromMinor(1234, 'BHD')).toBe(1.234);
    expect(isCleanAmount(1.234, 'BHD')).toBe(true);
    expect(isCleanAmount(1.234, 'SAR')).toBe(false);       // a third decimal is not a whole halala
    expect(isCleanAmount(12.34, 'BHD')).toBe(true);
    expect(isCleanAmount(0.1 + 0.2, 'BHD')).toBe(false);
  });
  it('BHD: shares and percentages add up to the total in fils', () => {
    const parts = allocateMinor(money(1000, 'BHD'), [1, 1, 1]);
    expect(parts.map((p) => p.amount_minor)).toEqual([334, 333, 333]);
    expect(sumMinor(parts)).toEqual({ amount_minor: 1000, currency: 'BHD' });
    expect(percentOfMinor(money(12345, 'BHD'), 10)).toEqual({ amount_minor: 1235, currency: 'BHD' });   // 1234.5 fils -> 1235
  });
  it('JPY has no minor digits: 123 is 123, 123.5 rounds to 124, display has no decimal point', () => {
    expect(toMinor(123, 'JPY')).toBe(123);
    expect(toMinor('123.5', 'JPY')).toBe(124);
    expect(toMinor('123.4', 'JPY')).toBe(123);
    expect(formatMoney(123, 'JPY')).toBe('123');
    expect(formatMoney(-7, 'JPY')).toBe('-7');
    expect(fromMinor(123, 'JPY')).toBe(123);
  });
});

describe('Money values and currencies are never mixed', () => {
  it('money() needs a known currency and a safe integer of minor units', () => {
    expect(money(1234, 'SAR')).toEqual({ amount_minor: 1234, currency: 'SAR' });
    expect(money(-0, 'SAR').amount_minor).toBe(0);
    for (const bad of [12.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '12' as any]) expect(() => money(bad, 'SAR')).toThrow(MoneyError);
    expect(() => money(1, 'XXX')).toThrow(MoneyError);
  });
  it('adding SAR to BHD throws currency_mismatch, an empty sum throws, one currency sums', () => {
    expect(() => sumMinor([money(1, 'SAR'), money(1, 'BHD')])).toThrow('currency_mismatch');
    expect(() => sumMinor([])).toThrow(MoneyError);
    expect(sumMinor([money(1, 'BHD'), money(2, 'BHD')])).toEqual({ amount_minor: 3, currency: 'BHD' });
  });
  it('a sum beyond the safe range throws', () => {
    expect(() => sumMinor([money(Number.MAX_SAFE_INTEGER, 'SAR'), money(1, 'SAR')])).toThrow('sum out of range');
  });
});
