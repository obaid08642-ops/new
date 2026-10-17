import { LoyaltyService } from './loyalty.service';

/**
 * The tiers' perks are Arabic sentences; a patient who reads English, Urdu, Hindi, Bengali or Filipino got them
 * untranslated (patient-app walkthrough, issue: loyalty hub in English). Every perk now carries a stable code in a
 * parallel `perk_codes` array that the clients translate; the Arabic `perks` stay for older clients.
 */
describe('LoyaltyService tiers: stable perk codes', () => {
  const service: any = Object.create(LoyaltyService.prototype);

  it('gives every perk a code, in the same order', () => {
    const tiers = service.getTiers();
    expect(tiers.map((t: any) => t.id)).toEqual(['bronze', 'silver', 'gold', 'platinum']);
    for (const tier of tiers) {
      expect(Array.isArray(tier.perk_codes)).toBe(true);
      expect(tier.perk_codes).toHaveLength(tier.perks.length);
      for (const code of tier.perk_codes) expect(code).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it('never reuses a code for two different perks', () => {
    const codes = service.getTiers().flatMap((t: any) => t.perk_codes);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('serves the codes in GET /loyalty/config', async () => {
    const withConfig: any = Object.create(LoyaltyService.prototype);
    withConfig.conn = { collection: () => ({ findOne: async () => null }) };
    const config = await withConfig.getConfig();
    expect(config.tiers[0].perk_codes).toEqual(['cashback_5_consult', 'priority_standard']);
  });
});
