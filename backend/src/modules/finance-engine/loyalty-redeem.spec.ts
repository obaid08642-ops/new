import { BadRequestException } from '@nestjs/common';
import { LoyaltyRedeemService } from './finance-engine.module';

/** Phase 7A-A4: points redeem only as a server-capped order discount. */
function serviceFor(opts: { balance?: number; config?: any; debitMatched?: number } = {}) {
  const service: any = Object.create(LoyaltyRedeemService.prototype);
  const updated: any[] = [];
  const inserted: any[] = [];
  service.conn = {
    collection: jest.fn((name: string) => {
      if (name === 'loyalty_config') return { findOne: jest.fn().mockResolvedValue(opts.config ? { value: opts.config } : null) };
      if (name === 'loyalty_accounts') {
        return {
          findOne: jest.fn().mockResolvedValue({ user_id: 'patient-1', points: opts.balance ?? 100000 }),
          updateOne: jest.fn().mockImplementation(async (...args: any[]) => { updated.push(args); return { matchedCount: opts.debitMatched ?? 1 }; }),
        };
      }
      if (name === 'loyalty_transactions') {
        return {
          findOne: jest.fn().mockResolvedValue(null),
          insertOne: jest.fn().mockImplementation(async (doc: any) => { inserted.push(doc); return {}; }),
        };
      }
      return { findOne: jest.fn().mockResolvedValue(null) };
    }),
  };
  return { service, updated, inserted };
}

describe('LoyaltyRedeemService cap (7A-A4)', () => {
  it('defaults the cap to 10% of the server order total', async () => {
    const { service } = serviceFor({ balance: 100000 });
    // 10 SAR value per 100 pts would exceed the 10 SAR cap on a 100 SAR order.
    await expect(service.redeem('patient-1', 'order-1', 200, 100)).rejects.toThrow(/points_exceed_cap: max 100/);
  });

  it('caps a lying client at the server-computed maximum', async () => {
    const { service, inserted } = serviceFor({ balance: 100000 });
    const out = await service.redeem('patient-1', 'order-1', 100, 100);
    expect(out).toEqual({ points: 100, discount_sar: 10 });
    expect(inserted[0]).toMatchObject({ points_delta: -100, kind: 'redeem' });
  });

  it('refuses redemption when disabled and when the balance is short', async () => {
    const { service } = serviceFor({ balance: 100000, config: { redeem_enabled: false } });
    await expect(service.redeem('patient-1', 'order-1', 10, 100)).rejects.toThrow(new BadRequestException('loyalty_redemption_disabled'));

    const poor = serviceFor({ balance: 100000, debitMatched: 0 });
    await expect(poor.service.redeem('patient-1', 'order-1', 10, 100)).rejects.toThrow(new BadRequestException('insufficient_points'));
  });
});
