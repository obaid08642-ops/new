import { clawbackShares } from './refund-clawback';

describe('clawbackShares (R11 P2: the refund split in whole halalas)', () => {
  const earning = { amount: 85, commission: 12, vat: 1.8, gross: 100 };

  it('a full refund of what was paid claws back the whole earning and both reversals', () => {
    expect(clawbackShares(earning, 100, 100)).toEqual({ fraction: 1, provider: 85, commission: 12, vat: 1.8 });
  });

  it('half of the payment claws back half of each part', () => {
    expect(clawbackShares(earning, 50, 100)).toEqual({ fraction: 0.5, provider: 42.5, commission: 6, vat: 0.9 });
  });

  it('a third rounds half away from zero on integers, never on a binary double', () => {
    // 85.00 / 3 = 28.3333 -> 28.33; 12 / 3 = 4; 1.80 / 3 = 0.60
    expect(clawbackShares(earning, 1, 3)).toEqual({ fraction: 0.3333, provider: 28.33, commission: 4, vat: 0.6 });
    // 0.10 of 0.30 paid (the 0.1 + 0.2 case): exactly a third, not 0.33333333333333337
    expect(clawbackShares({ amount: 0.3, commission: 0, vat: 0 }, 0.1, 0.3).provider).toBe(0.1);
  });

  it('a half halala goes up, in the same direction for every part', () => {
    // 0.05 SAR earning, half refunded = 2.5 halalas -> 3
    expect(clawbackShares({ amount: 0.05, commission: 0.05, vat: 0.05 }, 1, 2)).toMatchObject({ provider: 0.03, commission: 0.03, vat: 0.03 });
  });

  it('each part is within half a halala of its exact share of the refund (so together within 1.5 halalas of the exact total)', () => {
    for (const [refund, paid] of [[33.33, 100], [0.01, 3], [99.99, 100], [10, 30], [1234.56, 9999.99]] as const) {
      const e = { amount: paid * 0.85, commission: paid * 0.12, vat: paid * 0.018 };
      const s = clawbackShares(e, refund, paid);
      for (const [got, earn] of [[s.provider, e.amount], [s.commission, e.commission], [s.vat, e.vat]] as const) {
        const exactHalalas = (earn * 100 * refund) / paid;
        expect(Math.abs(got * 100 - exactHalalas)).toBeLessThanOrEqual(0.5 + 1e-6);
      }
      expect(s.fraction).toBeLessThanOrEqual(1);
    }
  });

  it('more than was paid is capped at the whole earning', () => {
    expect(clawbackShares(earning, 150, 100)).toMatchObject({ fraction: 1, provider: 85, commission: 12, vat: 1.8 });
  });

  it('with no payment total the earning gross is the base, and with neither the refund itself (everything is clawed back)', () => {
    expect(clawbackShares(earning, 50, 0)).toMatchObject({ fraction: 0.5, provider: 42.5 });
    expect(clawbackShares({ amount: 10, commission: 1, vat: 0.15 }, 20, 0)).toMatchObject({ fraction: 1, provider: 10, commission: 1, vat: 0.15 });
  });

  it('missing, negative or non-finite figures give zero for that part and never throw', () => {
    expect(clawbackShares({ amount: 85 }, 50, 100)).toEqual({ fraction: 0.5, provider: 42.5, commission: 0, vat: 0 });
    expect(clawbackShares({ amount: -5, commission: NaN, vat: undefined }, 50, 100)).toEqual({ fraction: 0.5, provider: 0, commission: 0, vat: 0 });
    expect(clawbackShares(earning, NaN, 100)).toEqual({ fraction: 0, provider: 0, commission: 0, vat: 0 });
    expect(clawbackShares(earning, 0, 100)).toEqual({ fraction: 0, provider: 0, commission: 0, vat: 0 });
  });
});
