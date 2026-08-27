import { JwtAuthGuard, getEffectiveRoles, normalizeEffectiveRole } from './auth.guard';
import { UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';
import { UserRole } from './enums';
import { Permission } from './permissions';
import { ImpersonationSessionService } from './impersonation-session.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: jest.Mocked<Reflector>;
  let connection: jest.Mocked<Connection>;
  let mockModel: any;
  let impersonationSessions: jest.Mocked<ImpersonationSessionService>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    mockModel = {
      findOne: jest.fn().mockReturnThis(),
      lean: jest.fn(),
      create: jest.fn(),
    };

    connection = {
      model: jest.fn().mockReturnValue(mockModel),
      collection: jest.fn().mockReturnValue({ findOne: jest.fn() }),
    } as any;

    impersonationSessions = { validate: jest.fn() } as any;
    guard = new JwtAuthGuard(jwtService, reflector, connection, impersonationSessions);
  });

  const createMockContext = (headers: Record<string, string>, params: any = {}, body: any = {}, query: any = {}, path = '/api/v1/private'): any => {
    const req = {
      headers,
      params,
      query,
      body,
      path,
      socket: { remoteAddress: '127.0.0.1' },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
  };

  it('should allow public endpoints to pass if no token is provided', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'isPublic') return true;
      return null;
    });

    const ctx = createMockContext({});
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if no token is provided on private endpoint', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);

    const ctx = createMockContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should authenticate user with valid JWT token', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    jwtService.verifyAsync.mockResolvedValue({ id: 'u1', role: UserRole.PATIENT });

    const ctx = createMockContext({ authorization: 'Bearer valid-token' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest();
    expect(req.user).toEqual({ id: 'u1', role: UserRole.PATIENT });
  });

  it('should enforce role checks', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'roles') return [UserRole.ADMIN];
      return null;
    });
    jwtService.verifyAsync.mockResolvedValue({ id: 'u1', role: UserRole.PATIENT });

    const ctx = createMockContext({ authorization: 'Bearer token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should enforce fine-grained permissions', async () => {
    reflector.getAllAndOverride.mockImplementation((key) => {
      if (key === 'permissions') return [Permission.DOCTOR_CREATE];
      return null;
    });
    jwtService.verifyAsync.mockResolvedValue({ id: 'u1', role: UserRole.PATIENT, permissions: [] });

    const ctx = createMockContext({ authorization: 'Bearer token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('fails closed for the legacy header-based impersonation path', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    jwtService.verifyAsync.mockResolvedValue({ id: 'admin1', role: UserRole.ADMIN, email: 'admin@nabdah.com' });

    const ctx = createMockContext({
      authorization: 'Bearer token',
      'x-impersonate-user-id': 'patient1',
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow('impersonation_session_required');
    const req = ctx.switchToHttp().getRequest();
    expect(req.user).toEqual({ id: 'admin1', role: UserRole.ADMIN, email: 'admin@nabdah.com' });
    expect(connection.model).not.toHaveBeenCalled();
  });

  it('blocks pending provider operations but permits only owned onboarding paths', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    jwtService.verifyAsync.mockResolvedValue({ id: 'provider-1', role: 'provider', scope: 'provider', provider_type: 'pharmacy' });
    const providerCollection: any = { findOne: jest.fn().mockResolvedValue({ status: 'pending_admin_approval' }) };
    (connection.collection as jest.Mock).mockReturnValue(providerCollection);

    await expect(guard.canActivate(createMockContext({ authorization: 'Bearer token' }, {}, {}, {}, '/api/v1/provider/jobs/queue'))).rejects.toThrow('provider_approval_required');
    await expect(guard.canActivate(createMockContext({ authorization: 'Bearer token' }, {}, {}, {}, '/api/v1/provider-onboarding/progress'))).resolves.toBe(true);
  });

  it('allows an approved provider through the central KYC gate', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    jwtService.verifyAsync.mockResolvedValue({ id: 'provider-1', role: 'provider', scope: 'provider' });
    (connection.collection as jest.Mock).mockReturnValue({ findOne: jest.fn().mockResolvedValue({ status: 'approved' }) });
    await expect(guard.canActivate(createMockContext({ authorization: 'Bearer token' }, {}, {}, {}, '/api/v1/provider/jobs/queue'))).resolves.toBe(true);
  });
});


describe('effective provider roles (FIX2)', () => {
  it('normalizes laboratory to lab', () => {
    expect(normalizeEffectiveRole('laboratory')).toBe(UserRole.LAB);
  });

  it('keeps the canonical lab role stable', () => {
    expect(normalizeEffectiveRole('lab')).toBe(UserRole.LAB);
  });

  it('matches provider role plus laboratory provider_type', () => {
    expect(getEffectiveRoles({ role: 'provider', provider_type: 'laboratory' })).toEqual(['provider', UserRole.LAB]);
  });

  it('normalizes radiology aliases', () => {
    expect(getEffectiveRoles({ role: 'provider', provider_type: 'radiology' })).toEqual(['provider', UserRole.RADIOLOGY]);
  });

  it('normalizes nursing aliases', () => {
    expect(getEffectiveRoles({ role: 'provider', provider_type: 'nursing' })).toEqual(['provider', UserRole.NURSING]);
  });

  it('normalizes hospital and pharmacy provider types', () => {
    expect(getEffectiveRoles({ role: 'provider', provider_type: 'hospital' })).toContain(UserRole.HOSPITAL);
    expect(getEffectiveRoles({ role: 'provider', provider_type: 'pharmacy' })).toContain(UserRole.PHARMACY);
  });

  it('deduplicates role and provider_type when both are canonical', () => {
    expect(getEffectiveRoles({ role: 'lab', provider_type: 'laboratory' })).toEqual([UserRole.LAB]);
  });
});


describe('JwtAuthGuard support session context', () => {
  it('attaches the validated impersonation session and original actor to the request', async () => {
    const jwt: any = { verifyAsync: jest.fn().mockResolvedValue({ id: 'patient-1', role: 'patient', scope: 'impersonation', impersonation_session_id: 'imp-1' }) };
    const reflector: any = { getAllAndOverride: jest.fn().mockReturnValue(null) };
    const connection: any = { collection: jest.fn() };
    const sessions: any = { validate: jest.fn().mockResolvedValue({ session: { id: 'imp-1', expiresAt: new Date('2030-01-01T00:00:00.000Z') }, impersonator: { id: 'admin-1', role: 'admin' } }) };
    const guard = new JwtAuthGuard(jwt, reflector, connection, sessions);
    const req: any = { headers: { authorization: 'Bearer support-token' }, params: {}, query: {}, body: {}, path: '/api/v1/support-session/context', socket: { remoteAddress: '127.0.0.1' } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => ({}), getClass: () => ({}) };

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.impersonator).toEqual({ id: 'admin-1', role: 'admin' });
    expect(req.impersonationSession).toEqual(expect.objectContaining({ id: 'imp-1' }));
  });
});
