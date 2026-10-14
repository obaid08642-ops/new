import { LoyaltyService } from './loyalty.service';

// OC-C C-17 (745/746/750): the referral schedule and cash rate are served by config.
function serviceFor(overrides: any = {}) {
  const service: any = Object.create(LoyaltyService.prototype);
  service.conn = { collection: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue({ key: 'global', value: overrides }) })) };
  service.getTiers = jest.fn().mockReturnValue([]);
  service.getEarnWays = jest.fn().mockResolvedValue([]);
  service.earnTable = jest.fn().mockResolvedValue({ referral_converted: 100, referral_welcome: 50 });
  return service as LoyaltyService;
}

describe('OC C-17 referral schedule and rate', () => {
  it('serves referral_points and the earn table referral amounts', async () => {
    const cfg: any = await serviceFor().getConfig();
    expect(cfg.referral_points).toBe(50);
    expect(cfg.earn_points).toMatchObject({ referral_converted: 100, referral_welcome: 50 });
  });

  it('serves a cash-equivalent rate by default, overridable by admin', async () => {
    expect((await serviceFor().getConfig()).point_value_sar).toBe(0.1);
    expect((await serviceFor({ point_value_sar: 0.2 }).getConfig()).point_value_sar).toBe(0.2);
  });
});
