import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';
import { JwtAuthGuard } from '../../common/auth.guard';
import { ImpersonationSessionService } from '../../common/impersonation-session.service';

describe('C2: Admin device allow-list enforcement', () => {
  let guard: JwtAuthGuard;
  let connection: any;
  let jwtService: any;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  beforeEach(async () => {
    connection = {
      collection: jest.fn((name: string) => {
        if (name === 'users') {
          return { findOne: jest.fn().mockResolvedValue({ id: 'u1', token_version: 1 }) };
        }
        if (name === 'admin_devices') {
          return { findOne: jest.fn().mockResolvedValue(null) };
        }
        return { findOne: jest.fn().mockResolvedValue(null) };
      }),
    };
    jwtService = { verifyAsync: jest.fn().mockResolvedValue({ id: 'u1', role: 'admin', tv: 1 }) };
    const impersonationSessions = { validate: jest.fn() };

    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === 'isPublic') return false;
        if (key === 'roles') return undefined;
        if (key === 'permissions') return undefined;
        if (key === 'checkOwnership') return undefined;
        return undefined;
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: 'Reflector', useValue: reflector },
        { provide: 'DatabaseConnection', useValue: connection },
        { provide: ImpersonationSessionService, useValue: impersonationSessions },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
  });

  it('rejects admin API call from unregistered device', async () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid', 'x-admin-device': '' },
          path: '/api/v1/admin/users',
          ip: '127.0.0.1',
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(ForbiddenException);
  });

  it('rejects admin API call with missing device header', async () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid' },
          path: '/api/v1/admin/users',
          ip: '127.0.0.1',
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(ForbiddenException);
  });

  it('allows admin API call from enrolled device', async () => {
    connection.collection = jest.fn((name: string) => {
      if (name === 'users') {
        return { findOne: jest.fn().mockResolvedValue({ id: 'u1', token_version: 1 }) };
      }
      if (name === 'admin_devices') {
        return { findOne: jest.fn().mockResolvedValue({ user_id: 'u1', device_hash: 'x'.repeat(64) }) };
      }
      return { findOne: jest.fn().mockResolvedValue(null) };
    });
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer valid', 'x-admin-device': 'a'.repeat(32) },
          path: '/api/v1/admin/users',
          ip: '127.0.0.1',
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
    const result = await guard.canActivate(ctx as any);
    expect(result).toBe(true);
  });

  // X4 (ca16fa7): the bootstrap exemption matched any path containing
  // "/admin/devices", so /api/v1/admin/<anything>/admin/devices slipped past
  // passkey enforcement.
  it('passkey enforcement exempts only the real passkey and device endpoints', async () => {
    const prev = process.env.ADMIN_PASSKEY_ENFORCED;
    process.env.ADMIN_PASSKEY_ENFORCED = 'true';
    connection.collection = jest.fn((name: string) => {
      if (name === 'users') return { findOne: jest.fn().mockResolvedValue({ id: 'u1', token_version: 1 }) };
      if (name === 'admin_devices') return { findOne: jest.fn().mockResolvedValue({ user_id: 'u1', device_hash: 'x'.repeat(64) }) };
      return { findOne: jest.fn().mockResolvedValue(null) }; // no passkey_credentials
    });
    const at = (path: string) => ({
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer valid', 'x-admin-device': 'a'.repeat(32) }, path, ip: '127.0.0.1' }) }),
      getHandler: () => ({}), getClass: () => ({}),
    });
    try {
      await expect(guard.canActivate(at('/api/v1/admin/users/admin/devices') as any)).rejects.toThrow('passkey_enrollment_required');
      await expect(guard.canActivate(at('/api/v1/admin/users') as any)).rejects.toThrow('passkey_enrollment_required');
      await expect(guard.canActivate(at('/api/v1/auth/passkey/enroll/options') as any)).resolves.toBe(true);
    } finally {
      process.env.ADMIN_PASSKEY_ENFORCED = prev;
    }
  });
});
