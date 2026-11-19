import { ConflictException } from '@nestjs/common';
import { ProviderOnboardingService } from './provider-onboarding.module';

/**
 * C2 (owner 2026-11-17): the licence expiry date of a provider who is already live moves only after an admin approved the renewed document (PATCH /provider/profile -> a reviewed credential
 * change). The registration wizard step 2 must not be a side door that writes it directly.
 */
describe('onboarding step2: the licence date is not a side door around the renewal review', () => {
  function setup(profileStatus: string, stored: Date | null) {
    const profile: any = { id: 'p1', user_id: 'u1', type: 'lab', status: profileStatus, onboarding_step: 3, license_expiry_date: stored, save: jest.fn().mockResolvedValue(undefined), toObject() { return { ...this }; } };
    const providerModel: any = { findOne: jest.fn().mockResolvedValue(profile), db: { collection: () => ({}) } };
    const service = new ProviderOnboardingService({} as any, providerModel, { emit: jest.fn() } as any, {} as any, {} as any);
    return { service, profile };
  }
  const OLD = new Date('2026-11-01T00:00:00.000Z');

  it.each(['active', 'suspended'])('a %s provider cannot set a different licence date through step2, and nothing is saved', async (status) => {
    const { service, profile } = setup(status, OLD);
    await expect(service.step2({ id: 'u1' }, { license_expiry_date: '2027-11-01' })).rejects.toThrow(new ConflictException('license_expiry_change_requires_review'));
    expect(profile.save).not.toHaveBeenCalled();
    expect(profile.license_expiry_date).toEqual(OLD);
  });

  it('the same date again (an app re-sending the whole step) is accepted and changes nothing', async () => {
    const { service, profile } = setup('active', OLD);
    await service.step2({ id: 'u1' }, { license_expiry_date: '2026-11-01', city: 'Riyadh' });
    expect(profile.license_expiry_date).toEqual(OLD);
    expect(profile.save).toHaveBeenCalled();
  });

  it.each(['pending', 'rejected'])('a %s application (a wizard in progress, or being corrected after a rejection) still types its date here', async (status) => {
    const { service, profile } = setup(status, OLD);
    await service.step2({ id: 'u1' }, { license_expiry_date: '2027-11-01' });
    expect(new Date(profile.license_expiry_date).toISOString().slice(0, 10)).toBe('2027-11-01');
    expect(profile.save).toHaveBeenCalled();
  });
});
