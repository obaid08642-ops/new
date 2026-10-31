import { NotFoundException } from '@nestjs/common';
import { ProvidersService } from './providers.service';

describe('ProvidersService.myProfile', () => {
  const createService = (profile: any) => {
    const userRepository = {};
    const providerRepository = { findOne: jest.fn().mockResolvedValue(profile) };
    const branchModel = {};
    const events = {};
    const publication = { refresh: jest.fn() };
    const connection = { db: { collection: jest.fn().mockReturnValue({ findOne: jest.fn().mockResolvedValue(null) }) } };
    return {
      service: new ProvidersService(userRepository as any, providerRepository as any, branchModel as any, events as any, publication as any, connection as any, {} as any),
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
  it('adminCreate never passes a raw phone value into the query', async () => {
    const filters: any[] = [];
    const userRepository = { findOne: jest.fn(async (f: any) => { filters.push(f); return { id: 'exists' }; }) };
    const service = new ProvidersService(userRepository as any, {} as any, {} as any, {} as any, { refresh: jest.fn() } as any, {} as any, {} as any);
    await expect(service.adminCreate({ phone: '+966500000001', type: 'doctor' }, {})).rejects.toThrow();
    expect(filters).toEqual([{ phone: { $eq: '+966500000001' } }]);
  });
});

describe('REVIEW-P3: generated provider passwords are unguessable', () => {
  const bcrypt = require('bcryptjs');
  it('adminCreate: generated password is long and random (not Temp@0..9999)', async () => {
    const created: any[] = [];
    const userRepository = { findOne: jest.fn(async () => null), create: jest.fn(async (u: any) => { created.push(u); return { ...u, id: 'u1', toObject: () => u }; }) };
    const providerRepository = { create: jest.fn(async (p: any) => ({ ...p, toObject: () => p })) };
    const service = new ProvidersService(userRepository as any, providerRepository as any, {} as any, { emit: jest.fn() } as any, { refresh: jest.fn() } as any, {} as any, {} as any);
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
    const service = new ProvidersService(userRepository as any, { create: jest.fn() } as any, branchModel as any, {} as any, {} as any, {} as any, {} as any);
    const r: any = await service.createBranchStaffAccount('adm', 'b1', { fullName: 'S', role: 'receptionist' });
    expect(await bcrypt.compare('Temp123!', created[0].password_hash)).toBe(false);
    expect(r.generated_password).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    expect(await bcrypt.compare(r.generated_password, created[0].password_hash)).toBe(true);
  });
  it('a doctor created by a branch admin starts pending licence verification, inactive and not verified', async () => {
    const users: any[] = [];
    const userRepository = {
      findOne: jest.fn(async () => ({ id: 'adm', role: 'hospital_admin', parent_provider_account_id: 'h1' })),
      create: jest.fn(async (u: any) => { users.push(u); return { ...u, id: 'doc1' }; }),
    };
    const profiles: any[] = [];
    const providerRepository = { create: jest.fn(async (p: any) => { profiles.push(p); return { ...p, id: 'prof1' }; }) };
    const branch = { _id: 'b1', doctors_roster: [] as string[], save: jest.fn() };
    const events = { emit: jest.fn() };
    const service = new ProvidersService(userRepository as any, providerRepository as any, { findById: jest.fn(async () => branch) } as any, events as any, {} as any, {} as any, {} as any);
    const r: any = await service.createBranchStaffAccount('adm', 'b1', { fullName: 'Dr', role: 'doctor', licenseNumber: '12-3456' });
    expect(users[0].active).toBe(false);
    expect(profiles[0]).toMatchObject({ status: 'pending', license_verified: false, license_number: '12-3456' });
    expect(profiles[0].approved_at).toBeUndefined();
    expect(events.emit).toHaveBeenCalledWith('provider.pending_review', { provider_id: 'prof1', type: 'doctor' });
    expect(branch.doctors_roster).toEqual(['doc1']);
    expect(r.message).toContain('بانتظار اعتماد');
  });

  it('a receptionist created by a branch admin can work at once (no licence to verify)', async () => {
    const users: any[] = [];
    const userRepository = { findOne: jest.fn(async () => ({ id: 'adm', role: 'branch_admin', parent_provider_account_id: 'h1' })), create: jest.fn(async (u: any) => { users.push(u); return { ...u, id: 'r1' }; }) };
    const providerRepository = { create: jest.fn() };
    const service = new ProvidersService(userRepository as any, providerRepository as any, { findById: jest.fn(async () => ({ _id: 'b1', doctors_roster: [], save: jest.fn() })) } as any, { emit: jest.fn() } as any, {} as any, {} as any, {} as any);
    await service.createBranchStaffAccount('adm', 'b1', { fullName: 'Rec', role: 'receptionist' });
    expect(users[0].active).toBe(true);
    expect(providerRepository.create).not.toHaveBeenCalled();
  });
});
