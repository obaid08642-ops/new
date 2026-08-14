import { JwtAuthGuard } from './auth.guard';
import { UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';
import { UserRole } from './enums';
import { Permission } from './permissions';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: jest.Mocked<Reflector>;
  let connection: jest.Mocked<Connection>;
  let mockModel: any;

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
    } as any;

    guard = new JwtAuthGuard(jwtService, reflector, connection);
  });

  const createMockContext = (headers: Record<string, string>, params: any = {}, body: any = {}, query: any = {}): any => {
    const req = {
      headers,
      params,
      query,
      body,
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

  it('should perform admin impersonation and substitution with logging', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    jwtService.verifyAsync.mockResolvedValue({ id: 'admin1', role: UserRole.ADMIN, email: 'admin@nabdah.com' });
    
    // Mock user model to return target user
    mockModel.lean.mockResolvedValue({
      id: 'patient1',
      role: UserRole.PATIENT,
      email: 'patient@nabdah.com',
      phone: '966500000000',
      full_name: 'Patient User',
      permissions: [],
    });

    const ctx = createMockContext({
      authorization: 'Bearer token',
      'x-impersonate-user-id': 'patient1',
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx.switchToHttp().getRequest();
    expect(req.impersonator.id).toBe('admin1');
    expect(req.user.id).toBe('patient1');
    expect(req.user.role).toBe(UserRole.PATIENT);
    expect(connection.model).toHaveBeenCalledWith('AuditLog');
    expect(mockModel.create).toHaveBeenCalled();
  });
});
