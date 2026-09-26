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

describe('REVIEW-P3: generated provider passwords are unguessable', () => {
  const bcrypt = require('bcryptjs');
  it('adminCreate: generated password is long and random (not Temp@0..9999)', async () => {
    const created: any[] = [];
    const userRepository = { findOne: jest.fn(async () => null), create: jest.fn(async (u: any) => { created.push(u); return { ...u, id: 'u1', toObject: () => u }; }) };
    const providerRepository = { create: jest.fn(async (p: any) => ({ ...p, toObject: () => p })) };
    const service = new ProvidersService(userRepository as any, providerRepository as any, {} as any, { emit: jest.fn() } as any, { refresh: jest.fn() } as any);
    const r: any = await service.adminCreate({ phone: '+966500000009', type: 'doctor', full_name: 'x', name_ar: 'x' }, {}).catch((e: any) => ({ err: e }));
    expect(r.err).toBeUndefined();
    expect(r.generated_password).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    expect(r.generated_password).not.toMatch(/^Temp@\d{1,4}$/);
  });
  it('branch staff without a password does not get the fixed Temp123!', async () => {
    const created: any[] = [];
    const userRepository = {
      findOne: jest.fn(async () => ({ id: 'adm', role: 'hospital_admin', parent_provider_account_id: 'h1' })),
      create: jest.fn(async (u: any) => { created.push(u); return { ...u, id: 'staff1' }; }),
    };
    const branchModel = { findById: jest.fn(async () => ({ _id: 'b1', doctors_roster: [], save: jest.fn() })) };
    const service = new ProvidersService(userRepository as any, { create: jest.fn() } as any, branchModel as any, {} as any, { refresh: jest.fn() } as any);
    const r: any = await service.createBranchStaffAccount('adm', 'b1', { fullName: 'S', role: 'receptionist' });
    expect(await bcrypt.compare('Temp123!', created[0].password_hash)).toBe(false);
    expect(r.generated_password).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    expect(await bcrypt.compare(r.generated_password, created[0].password_hash)).toBe(true);
  });
});
