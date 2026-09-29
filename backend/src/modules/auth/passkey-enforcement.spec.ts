import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { PasskeyService } from './passkey.service';
import { PasskeyCredential } from './schemas/passkey-credential.schema';
import { User } from '../../schemas/user.schema';
import { RedisService } from '../redis/redis.service';

describe('C1: Passkey enforcement for admin roles', () => {
  let passkeys: PasskeyService;
  let userModel: any;
  let passkeyModel: any;

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
    passkeyModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
      deleteOne: jest.fn(),
      updateOne: jest.fn(),
    };
    const redis = { getClient: jest.fn(() => null) };

    const module = await Test.createTestingModule({
      providers: [
        PasskeyService,
        { provide: getModelToken(PasskeyCredential.name), useValue: passkeyModel },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    passkeys = module.get(PasskeyService);
  });

  describe('assertEnrollmentAllowed', () => {
    it('rejects non-admin roles', async () => {
      userModel.findOne.mockReturnValue({ lean: async () => ({ role: 'patient' }) });
      await expect(passkeys.assertEnrollmentAllowed({ id: 'u1' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('allows admin role', async () => {
      userModel.findOne.mockReturnValue({ lean: async () => ({ role: 'admin' }) });
      const result = await passkeys.assertEnrollmentAllowed({ id: 'u1' });
      expect(result.role).toBe('admin');
    });

    it('requires existing passkey when requireExisting=true', async () => {
      userModel.findOne.mockReturnValue({ lean: async () => ({ role: 'admin' }) });
      passkeyModel.countDocuments.mockResolvedValue(0);
      await expect(passkeys.assertEnrollmentAllowed({ id: 'u1' }, true))
        .rejects.toThrow('existing_passkey_required');
    });

    it('allows when existing passkey present', async () => {
      userModel.findOne.mockReturnValue({ lean: async () => ({ role: 'admin' }) });
      passkeyModel.countDocuments.mockResolvedValue(1);
      const result = await passkeys.assertEnrollmentAllowed({ id: 'u1' }, true);
      expect(result.role).toBe('admin');
    });
  });

  describe('isEligible', () => {
    it('returns eligible for admin role', async () => {
      userModel.findOne.mockReturnValue({ lean: async () => ({ role: 'admin' }) });
      const result = await passkeys.isEligible({ id: 'u1' });
      expect(result.eligible).toBe(true);
    });

    it('returns not eligible for patient role', async () => {
      userModel.findOne.mockReturnValue({ lean: async () => ({ role: 'patient' }) });
      const result = await passkeys.isEligible({ id: 'u1' });
      expect(result.eligible).toBe(false);
    });
  });
});
