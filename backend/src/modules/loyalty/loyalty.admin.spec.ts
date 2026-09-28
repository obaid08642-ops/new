import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

function serviceFor(existing?: any) {
  const service: any = Object.create(LoyaltyService.prototype);
  const created: any[] = [];
  const updates: any[] = [];
  service.rewardM = {
    create: jest.fn().mockImplementation(async (doc: any) => { created.push(doc); return doc; }),
    findOneAndUpdate: jest.fn().mockImplementation(async (_q: any, patch: any) => { updates.push(patch); return existing ? { id: 'r-1', ...patch } : null; }),
  };
  service.challengeM = {
    create: jest.fn().mockImplementation(async (doc: any) => { created.push(doc); return doc; }),
    findOneAndUpdate: jest.fn().mockImplementation(async (_q: any, patch: any) => { updates.push(patch); return existing ? { id: 'c-1', ...patch } : null; }),
  };
  const configDoc: any = { value: { points_per_order: 10 } };
  service.conn = { collection: jest.fn().mockReturnValue({
    findOne: jest.fn().mockResolvedValue(configDoc),
    updateOne: jest.fn().mockImplementation(async (_q: any, update: any) => { Object.assign(configDoc.value, update?.$set?.value || {}); return {}; }),
  }) };
  return { service, created, updates };
}

describe('LoyaltyService admin catalogue (LJ-08)', () => {
  it('creates a reward with a generated id and validates fields', async () => {
    const { service, created } = serviceFor();
    await service.adminCreateReward({ title_ar: 'قسيمة', title_en: 'Coupon', points_required: 500, reward_type: 'coupon', stock: 5 });
    expect(created[0]).toMatchObject({ title_ar: 'قسيمة', points_required: 500, reward_type: 'coupon', stock: 5, active: true });
    expect(created[0].id).toBeTruthy();

    await expect(service.adminCreateReward({ title_ar: 'x', title_en: 'x', points_required: 0, reward_type: 'coupon' })).rejects.toThrow(BadRequestException);
    await expect(service.adminCreateReward({ title_ar: 'x', title_en: 'x', points_required: 10, reward_type: 'rocket' })).rejects.toThrow(BadRequestException);
  });

  it('rejects an update for a missing reward', async () => {
    const { service } = serviceFor(undefined);
    await expect(service.adminUpdateReward('missing', { stock: 3 })).rejects.toThrow(NotFoundException);
  });

  it('validates challenge dates and reward points before creating', async () => {
    const { service } = serviceFor();
    await expect(service.adminCreateChallenge({ title_ar: 'x', title_en: 'x', target_action: 'book', reward_points: 10, start_date: '2026-01-02', end_date: '2026-01-01' })).rejects.toThrow(BadRequestException);
    await expect(service.adminCreateChallenge({ title_ar: '', title_en: '', target_action: 'book', reward_points: 10 })).rejects.toThrow(BadRequestException);
    await expect(service.adminCreateChallenge({ title_ar: 'ت', title_en: 'c', target_action: 'book_appointment', reward_points: 200, start_date: '2026-01-01', end_date: '2026-02-01' })).resolves.toMatchObject({ id: expect.any(String) });
  });
});

describe('Loyalty admin config (LJ-08)', () => {
  it('writes only whitelisted keys and audits the change', async () => {
    const { service } = serviceFor();
    const out = await service.adminUpdateConfig({ points_per_order: 25, referral_points: 60, tiers: [{ hacked: true }] }, { id: 'admin-1' });

    const col = service.conn.collection('loyalty_config');
    const [, update] = col.updateOne.mock.calls[0];
    expect(update.$set.value).toEqual({ points_per_order: 25, referral_points: 60 });
    expect(update.$set.value).not.toHaveProperty('tiers');
    expect(update.$push.audit.changes).toEqual({ points_per_order: 25, referral_points: 60 });
    expect(update.$set.updated_by).toBe('admin-1');
    expect(out.points_per_order).toBe(25);
  });

  it('rejects an empty or non-numeric config patch', async () => {
    const { service } = serviceFor();
    await expect(service.adminUpdateConfig({}, { id: 'a' })).rejects.toThrow(BadRequestException);
    await expect(service.adminUpdateConfig({ points_per_order: -1 }, { id: 'a' })).rejects.toThrow(BadRequestException);
  });
});
