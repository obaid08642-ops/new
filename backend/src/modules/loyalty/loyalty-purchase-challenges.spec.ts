import { BadRequestException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

// D-9: loyalty challenges are health habits only (owner decision).
// Purchase-tied target actions are refused at create/update and hidden from patients.
function serviceFor() {
  const service: any = Object.create(LoyaltyService.prototype);
  const created: any[] = [];
  service.challengeM = {
    create: jest.fn().mockImplementation(async (doc: any) => { created.push(doc); return doc; }),
    findOneAndUpdate: jest.fn().mockImplementation(async (q: any, patch: any) => ({ id: q?.id || 'c-1', target_action: 'vitals_logged', ...patch })),
    findOne: jest.fn().mockResolvedValue({ id: 'ch-vitals', target_action: 'vitals_logged' }),
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { id: 'ch-buy', target_action: 'order_delivered', active: true },
        { id: 'ch-vitals', target_action: 'vitals_logged', active: true },
      ]),
    }),
  };
  service.progressM = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) };
  return { service, created };
}

const challenge = (target_action: string) => ({
  title_ar: 'تحدي', title_en: 'Challenge', target_action, target_count: 3, reward_points: 50,
  start_date: new Date(Date.now() - 86_400_000).toISOString(),
  end_date: new Date(Date.now() + 30 * 86_400_000).toISOString(),
});

describe('D-9 health-habit challenges only', () => {
  it('refuses a purchase challenge at create', async () => {
    const { service } = serviceFor();
    for (const a of ['order_delivered', 'order_medicine']) {
      await expect(service.adminCreateChallenge(challenge(a))).rejects.toThrow(BadRequestException);
    }
  });

  it('accepts health-habit challenges at create', async () => {
    const { service, created } = serviceFor();
    for (const a of ['vitals_logged', 'checkup_completed']) {
      await expect(service.adminCreateChallenge(challenge(a))).resolves.toMatchObject({ target_action: a });
    }
    expect(created).toHaveLength(2);
  });

  it('refuses to change a challenge into a purchase challenge', async () => {
    const { service } = serviceFor();
    await expect(service.adminUpdateChallenge('ch-vitals', { target_action: 'order_delivered' })).rejects.toThrow(BadRequestException);
    expect(service.challengeM.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('hides purchase challenges from patients', async () => {
    const { service } = serviceFor();
    const rows: any[] = await service.getActiveChallenges('pat-1');
    expect(rows.some((r: any) => r.target_action === 'order_delivered')).toBe(false);
    expect(rows.some((r: any) => r.target_action === 'vitals_logged')).toBe(true);
  });
});
