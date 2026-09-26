import { NotFoundException } from '@nestjs/common';
import { ProvidersService } from './providers.service';

describe('ProvidersService.myProfile', () => {
  const createService = (profile: any) => {
    const userRepository = {};
    const providerRepository = { findOne: jest.fn().mockResolvedValue(profile) };
    const branchModel = {};
    const events = {};
    const publication = { refresh: jest.fn() };
    return {
      service: new ProvidersService(userRepository as any, providerRepository as any, branchModel as any, events as any, publication as any),
      providerRepository,
    };
  };

  it('returns only the profile matched by a provider account or provider-profile identity', async () => {
    const profile = { id: 'provider-profile-owner', user_id: 'provider-user-owner' };
    const { service, providerRepository } = createService(profile);

    await expect(service.myProfile({
      id: 'provider-account-owner',
      role: 'provider',
      provider_id: 'provider-profile-owner',
    })).resolves.toEqual(profile);

    expect(providerRepository.findOne).toHaveBeenCalledWith(
      {
        $or: [
          { user_id: { $in: ['provider-account-owner', 'provider-profile-owner'] } },
          { id: { $in: ['provider-account-owner', 'provider-profile-owner'] } },
          { account_id: { $in: ['provider-account-owner', 'provider-profile-owner'] } },
        ],
      },
      { _id: 0, __v: 0 },
    );
  });

  it('fails closed when no profile matches the authenticated actor identifiers', async () => {
    const { service } = createService(null);

    await expect(service.myProfile({
      id: 'provider-account-foreign',
      role: 'provider',
      provider_id: 'provider-profile-foreign',
    })).rejects.toThrow(NotFoundException);
  });

  it('fails closed when no usable actor identifier is supplied', async () => {
    const { service, providerRepository } = createService({ id: 'should-not-be-read' });

    await expect(service.myProfile({ role: 'provider' })).rejects.toThrow(NotFoundException);
    expect(providerRepository.findOne).not.toHaveBeenCalled();
  });
});

describe('REVIEW-P3: provider phone lookups pin the value with $eq', () => {
  it('apply + adminCreate never pass a raw phone value into the query', async () => {
    const filters: any[] = [];
    const userRepository = { findOne: jest.fn(async (f: any) => { filters.push(f); return { id: 'exists' }; }) };
    const service = new ProvidersService(userRepository as any, {} as any, {} as any, {} as any, { refresh: jest.fn() } as any);
    await expect(service.apply({ phone: '+966500000000', type: 'doctor' } as any)).rejects.toThrow();
    await expect(service.adminCreate({ phone: '+966500000001', type: 'doctor' }, {})).rejects.toThrow();
    expect(filters).toEqual([{ phone: { $eq: '+966500000000' } }, { phone: { $eq: '+966500000001' } }]);
  });
});
