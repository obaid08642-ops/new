import { LoyaltyService } from './loyalty.service';

/** Phase 7A-A5: admin-configured earn values and daily/monthly caps. */
function serviceFor(opts: { config?: any; earned?: number } = {}) {
  const service: any = Object.create(LoyaltyService.prototype);
  service.conn = {
    collection: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(opts.config ? { value: opts.config } : null),
    }),
  };
  service.txM = {
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
  };
  service.accountM = {
    findOne: jest.fn().mockResolvedValue({ user_id: 'u-1', points: 0, lifetime_points: 0, tier: 'bronze' }),
    updateOne: jest.fn().mockResolvedValue({}),
    create: jest.fn(),
  };
  service.progressM = { findOne: jest.fn().mockResolvedValue(null) };
  service.challengeM = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) };
  if (opts.earned) {
    service.txM.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ points_delta: opts.earned }]),
    });
  }
  return service;
}

describe('LoyaltyService earn config (7A-A5)', () => {
  it('uses admin earn_points over the built-in defaults', async () => {
    const service = serviceFor({ config: { earn_points: { vitals_logged: 25 } } });
    const table = await service.earnTable();
    expect(table.vitals_logged).toBe(25);
    expect(table.booking_completed).toBe(50);
  });

  it('stops non-purchase earning past the daily cap', async () => {
    const service = serviceFor({ config: { earn_caps: { daily: { vitals_logged: 10 } } }, earned: 10 });
    const out = await service.awardPoints('u-1', 'vitals_logged', 'health');
    expect(out).toMatchObject({ ok: true, points_awarded: 0, capped: true });
    expect(service.accountM.updateOne).not.toHaveBeenCalled();
  });

  it('never caps purchase-linked earning', async () => {
    const service = serviceFor({ config: { earn_caps: { daily: { booking_completed: 1 } } }, earned: 100 });
    const out = await service.awardPoints('u-1', 'booking_completed', 'appointment', 'appt-1');
    expect(out.points_awarded).toBe(50);
  });
});
