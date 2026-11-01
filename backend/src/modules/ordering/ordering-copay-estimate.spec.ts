import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { cardCopay, estimatePatientShare, OrderingService, quoteBreakdown } from './ordering.service';
import { SavePolicyDto } from '../insurance-engine/insurance-engine.dto';
import { UpdatePatientInsuranceDto } from '../users/users.dto';

/** Owner decision 2026-10-24: an estimate of the patient's share before booking, from the figures on their card; null otherwise. */
describe('insurance estimate before booking', () => {
  it('reads the card figures only when valid (the cap is optional)', () => {
    expect(cardCopay({ copay_percent: 20, copay_cap_sar: 50 })).toEqual({ percent: 20, cap: 50 });
    expect(cardCopay({ copay_percent: 20 })).toEqual({ percent: 20, cap: null });
    expect(cardCopay({ copay_cap_sar: 50 })).toBeNull();
    expect(cardCopay({ copay_percent: 120 })).toBeNull();
    expect(cardCopay({ copay_percent: '20' })).toBeNull();
    expect(cardCopay(undefined)).toBeNull();
  });

  it('share = min(price x percent, cap) per covered item, the full price of an uncovered one, plus the home fee', () => {
    expect(estimatePatientShare([{ price: 300, covered: true }], { percent: 20, cap: 50 })).toBe(50); // 60 capped at 50
    expect(estimatePatientShare([{ price: 100, covered: true }], { percent: 20, cap: 50 })).toBe(20);
    expect(estimatePatientShare([{ price: 100, covered: true }, { price: 80, covered: false }], { percent: 10, cap: null })).toBe(90);
    expect(estimatePatientShare([{ price: 100, covered: true }], { percent: 20, cap: 50 }, 30)).toBe(50);
  });

  const svc = (): any => Object.create(OrderingService.prototype);
  const cand = (inNetwork: boolean) => ({ provider_id: 'p1', prices: { a: 300, b: 100 }, home_fee: 40, in_network: inNetwork, coverage: { a: 'needs_approval', b: 'not_covered' } });

  it('the best match carries estimated_patient_share only with card figures AND an accepting provider, marked as an estimate', () => {
    const copay = { percent: 20, cap: 50 };
    const withFigures: any = svc().shares(cand(true), ['a', 'b'], 'home', 'insurance', 0.8, copay);
    expect(withFigures.estimated_patient_share).toBe(50 + 100 + 40);
    expect(withFigures.estimated_patient_share_basis).toBe('card_copay');
    for (const out of [svc().shares(cand(false), ['a', 'b'], 'home', 'insurance', 0.8, copay), svc().shares(cand(true), ['a', 'b'], 'home', 'insurance', 0.8, null), svc().shares(cand(true), ['a', 'b'], 'home', 'cash', 0.8, copay)] as any[]) {
      expect(out.estimated_patient_share).toBeNull();
      expect(out.estimated_patient_share_basis).toBeNull();
    }
  });

  it('the policy DTOs validate the card figures', async () => {
    for (const cls of [SavePolicyDto, UpdatePatientInsuranceDto] as any[]) {
      expect(await validate(plainToInstance(cls, { copay_percent: 20, copay_cap_sar: 100 }))).toHaveLength(0);
      for (const bad of [{ copay_percent: 101 }, { copay_percent: -1 }, { copay_cap_sar: -5 }, { copay_cap_sar: 'x' }]) {
        expect((await validate(plainToInstance(cls, bad))).length).toBeGreaterThan(0);
      }
    }
  });
});

describe('the quote states the home fee and the VAT of every provider row', () => {
  it('home fee, VAT and subtotal come from the server, the VAT inside the total', () => {
    expect(quoteBreakdown(165, 40, 0.15)).toEqual({ home_fee: 40, vat_rate: 0.15, vat: 21.52, subtotal: 143.48 });
    expect(quoteBreakdown(100, undefined, 0.15).home_fee).toBe(0);
    expect(quoteBreakdown(100, 'x', 0.1)).toMatchObject({ home_fee: 0, vat: 9.09, subtotal: 90.91 });
  });
});
