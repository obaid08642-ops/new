import { BadRequestException } from '@nestjs/common';
import { ProviderOnboardingService } from './provider-onboarding.module';
import { ProviderType, UserRole } from '../../common/enums';

describe('ProviderOnboardingService start', () => {
  function setup() {
    const userModel = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    const providerModel = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'profile-1', type: ProviderType.LAB, onboarding_step: 1 }) };
    const bus = { emit: jest.fn().mockResolvedValue(undefined) };
    const contracts = {};
    return { service: new ProviderOnboardingService(userModel as any, providerModel as any, bus as any, contracts as any), userModel, providerModel };
  }

  it('requires a contact identity before creating an onboarding-only identity', async () => {
    const { service, userModel } = setup();
    await expect(service.start({ phone: '500000001', password: 'password-1', full_name: 'Lab', type: ProviderType.LAB }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(userModel.create).not.toHaveBeenCalled();
  });

  it('creates a restricted guest identity and a pending provider profile, never an active provider role', async () => {
    const { service, userModel, providerModel } = setup();
    const result = await service.start({ phone: '500000001', password: 'password-1', full_name: 'Lab Operator', email: 'lab@example.test', type: ProviderType.LAB });
    expect(result).toEqual(expect.objectContaining({ user_id: 'user-1', profile_id: 'profile-1', step: 1 }));
    expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({
      role: UserRole.GUEST,
      onboarding_only: true,
      active: true,
    }));
    expect(providerModel.create).toHaveBeenCalledWith(expect.objectContaining({ type: ProviderType.LAB, status: 'pending', onboarding_step: 1 }));
  });
});
