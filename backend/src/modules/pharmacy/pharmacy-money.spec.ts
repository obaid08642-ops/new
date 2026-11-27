/** Money step M6: pharmacy settlement in the allocation's own currency. SAR is the old arithmetic exactly; a 3-digit currency settles to the fils. Pure. */
import { pharmacyCurrency, roundAmount, settlementAmounts } from './pharmacy-money';
import { pharmacySettlementGross } from './services/pharmacy-allocation.service';

// the expressions the service had before M6, kept here as the golden
const legacy = (gross: number, fee: number, pct: number, vatPct: number) => {
  const commission = Math.round(gross * pct) / 100;
  const vat = Math.round(commission * vatPct) / 100;
  return { commission, vat, net: Math.round((gross - commission - vat) * 100) / 100, codOwed: Math.round((commission + vat + fee) * 100) / 100 };
};
let seed = 20261127;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

describe('pharmacyCurrency / roundAmount', () => {
  it('the allocation\'s own currency, else the default', () => {
    expect(pharmacyCurrency({ totals: { currency: 'BHD' } })).toBe('BHD');
    expect(pharmacyCurrency({ totals: {} })).toBe('SAR');
    expect(pharmacyCurrency(undefined)).toBe('SAR');
  });
  it('SAR is exactly Math.round(x * 100) / 100 (including its float edges)', () => {
    for (const x of [0, 1, 1.005, 2.675, 10.555, 99.995, 0.1 + 0.2, 1234.565, -1.005]) expect(roundAmount(x, 'SAR')).toBe(Math.round(x * 100) / 100);
    for (let i = 0; i < 5000; i++) { const x = Math.round(rnd() * 1e6) / 1000; expect(roundAmount(x, 'SAR')).toBe(Math.round(x * 100) / 100); }
  });
  it('BHD rounds to the fils, JPY to the unit', () => {
    expect(roundAmount(1.2344, 'BHD')).toBe(1.234);
    expect(roundAmount(1.2346, 'BHD')).toBe(1.235);
    expect(roundAmount(10.6, 'JPY')).toBe(11);
  });
});

describe('settlementAmounts', () => {
  it('SAR: identical to the previous expressions over 20000 random settlements', () => {
    for (let i = 0; i < 20000; i++) {
      const gross = Math.round(rnd() * 500000) / 100;          // 0 .. 5000.00
      const fee = Math.round(rnd() * 5000) / 100;
      const pct = [10, 12, 15, 12.5, 7.5, 0, 20][Math.floor(rnd() * 7)];
      const vatPct = [15, 5, 0][Math.floor(rnd() * 3)];
      expect(settlementAmounts(gross, fee, pct, vatPct, 'SAR')).toEqual(legacy(gross, fee, pct, vatPct));
    }
  });
  it('SAR worked example: 100.50 gross at 12% and 15% VAT', () => {
    expect(settlementAmounts(100.5, 10, 12, 15, 'SAR')).toEqual({ commission: 12.06, vat: 1.81, net: 86.63, codOwed: 23.87 });
  });
  it('BHD: every amount is a whole number of fils (12.345 at 15% and 10% VAT)', () => {
    const r = settlementAmounts(12.345, 0.5, 15, 10, 'BHD');
    expect(r).toEqual({ commission: 1.852, vat: 0.185, net: 10.308, codOwed: 2.537 });   // 12.345*15% = 1.85175 -> 1.852; vat 0.1852 -> 0.185
    for (const v of Object.values(r)) expect(Math.round(v * 1000)).toBe(Number((v * 1000).toFixed(0)));
    expect(r.net).toBe(Math.round((12.345 - r.commission - r.vat) * 1000) / 1000);
  });
  it('BHD: net + commission + VAT adds back to the gross exactly, over 20000 random settlements', () => {
    for (let i = 0; i < 20000; i++) {
      const gross = Math.round(rnd() * 5000000) / 1000;
      const r = settlementAmounts(gross, 0, [10, 12, 15, 7.5][Math.floor(rnd() * 4)], [10, 5, 0][Math.floor(rnd() * 3)], 'BHD');
      expect(Math.round((r.net + r.commission + r.vat) * 1000)).toBe(Math.round(gross * 1000));
    }
  });
});

describe('pharmacySettlementGross by currency', () => {
  it('SAR (no currency on the quote): unchanged', () => {
    expect(pharmacySettlementGross({ totals: { total: 110.5, delivery_fee: 10 } }, { delivery_mode: 'platform' })).toEqual({ gross: 100.5, platformDeliveryFee: 10, delivery_mode: 'platform' });
  });
  it('a BHD quote keeps 3 digits: 12.345 total with a 0.5 fee gives a gross of 11.845', () => {
    expect(pharmacySettlementGross({ totals: { total: 12.345, delivery_fee: 0.5, currency: 'BHD' } }, { delivery_mode: 'platform' })).toEqual({ gross: 11.845, platformDeliveryFee: 0.5, delivery_mode: 'platform' });
  });
});
