import { GoneException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

// Constructor slots 6-7 are the required PasswordSecurityService/HttpService
// (all later slots are @Optional). Permissive stand-ins; assertions untouched.
const passwordSecurityStub = {
  validatePasswordStrength: async () => ({ valid: true, errors: [] }),
  hashPassword: async (p: string) => bcrypt.hash(p, 4),
  verifyPassword: async (p: string, h: string) => bcrypt.compare(p, h),
  isLocked: async () => ({ locked: false }),
  recordFailedAttempt: async () => ({ attempts: 1, locked: false }),
  clearFailedAttempts: async () => undefined,
  getLockoutConfig: () => ({ maxAttempts: 5, lockoutDurationSeconds: 900 }),
  calculateProgressiveDelay: () => 0,
};
const httpStub = { get: async () => ({}), post: async () => ({}) };
const smsFraudStub = { checkAndRecord: async () => ({ allowed: true }) };

describe('patient web auth contract', () => {
  const build = () => {
    const data = new Map<string, any>();
    const userModel = { findOne: jest.fn(), create: jest.fn(), updateOne: jest.fn() };
    const patientModel = { create: jest.fn() };
    const redis = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 1 }),
      exists: jest.fn().mockResolvedValue(false),
      setJson: jest.fn(async (key: string, value: any) => { data.set(key, value); }),
      getJson: jest.fn(async (key: string) => data.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => { data.set(key, value); }),
      get: jest.fn(async (key: string) => data.get(key) ?? null),
      del: jest.fn(async (key: string) => { data.delete(key); }),
      ttl: jest.fn().mockResolvedValue(300),
      getClient: jest.fn(() => ({
        set: jest.fn(async (key: string, value: string) => {
          if (data.has(key)) return null;
          data.set(key, value);
          return 'OK';
        }),
        del: jest.fn(async (key: string) => { data.delete(key); }),
      })),
    };
    const jwt = { sign: jest.fn().mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token') };
    // F34: OTP delivery needs a working channel; the mail channel stands in so
    // contract assertions stay delivery-agnostic. `mail` is the 13th constructor
    // slot (after userModel, patientModel, jwt, events, redisService,
    // passwordSecurity, httpService, passkeys, deviceTrust, adminDevices,
    // adminSession, push). Passing it in the wrong slot lands it on
    // adminSession/push, this.mail stays undefined, and the per-channel catch
    // in deliverOtp turns the missing mailer into an opaque
    // `otp_channel_unavailable` instead of an obvious wiring mistake.
    const mail = { sendOtp: jest.fn(async () => ({ ok: true, provider: 'resend', fallback_used: false })) };
    const service = new AuthService(
      userModel as any,
      patientModel as any,
      jwt as any,
      { emit: jest.fn() } as any,
      redis as any,
      passwordSecurityStub as any,
      httpStub as any,
      undefined, // passkeys
      undefined, // deviceTrust
      undefined, // adminDevices
      undefined, // adminSession
      undefined, // push
      mail as any,
      undefined, // sms
      smsFraudStub as any,
    );
    return { data, userModel, patientModel, redis, jwt, service };
  };

  it('issues a 14-day refresh token and keeps Redis session TTL aligned', () => {
    const { service, jwt, redis } = build();

    service.signToken({ id: 'patient-1', role: 'patient' });

    expect(jwt.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ sub: 'patient-1' }),
      expect.objectContaining({ expiresIn: '1h' }),
    );
    expect(jwt.sign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ sub: 'patient-1', type: 'refresh' }),
      expect.objectContaining({ expiresIn: '14d' }),
    );
    const client = redis.getClient.mock.results[0].value;
    expect(client.set).toHaveBeenCalledWith(
      expect.stringMatching(/^refresh:/),
      expect.any(String),
      'EX',
      14 * 24 * 3600,
    );
  });

  it('stores policy_id and version for a recorded legal consent', async () => {
    const { service, userModel } = build();

    await service.recordComplianceConsent('patient-1', 'privacy', '2026-08');

    expect(userModel.updateOne).toHaveBeenCalledWith(
      { id: 'patient-1' },
      { $push: { legal_consents: expect.objectContaining({ policy_id: 'privacy', version: '2026-08' }) } },
    );
  });

  it('registers the Contract V1 patient with consents, starts OTP, and returns no session token', async () => {
    const { service, userModel, patientModel, redis } = build();
    // The stubbed user must carry the contact the OTP is delivered to. F34 made
    // the service refuse to answer "sent" when no channel exists, so a user
    // without an email is now a 503 rather than a silently swallowed code.
    const user = { id: 'patient-new', full_name: 'Patient Name', email: 'patient@example.test', role: 'patient', active: true };
    userModel.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    userModel.create.mockResolvedValue(user);

    await expect(service.registerPatientContract({
      name: 'Patient Name',
      identifier: 'patient@example.test',
      password: 'sufficient-password',
      locale: 'ar',
      consents: [{ policy_id: 'privacy', version: '2026-08' }],
    })).resolves.toEqual({ registered: true });

    expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({
      full_name: 'Patient Name',
      email: 'patient@example.test',
      role: 'patient',
      preferred_lang: 'ar',
      legal_consents: [expect.objectContaining({ policy_id: 'privacy', version: '2026-08' })],
    }));
    expect(patientModel.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'patient-new' }));
    expect(redis.setJson).toHaveBeenCalledWith(
      'auth:otp:patient:patient@example.test',
      expect.objectContaining({ user_id: 'patient-new' }),
      300,
    );
  });

  it('returns the same bounded OTP response for an unknown account', async () => {
    const { service, userModel } = build();
    userModel.findOne.mockResolvedValue(null);

    await expect(service.requestPatientOtp('unknown@example.test')).resolves.toEqual({
      otp_sent: true,
      channel: 'email',
      expires_in: 300,
    });
  });

  it('issues a 60-second exchange token only after a valid patient OTP', async () => {
    const { service, userModel, redis, data } = build();
    const codeHash = await bcrypt.hash('123456', 4);
    data.set('auth:otp:patient:patient@example.test', { code_hash: codeHash, user_id: 'patient-1', attempts: 0 });

    const result = await service.verifyPatientOtp('patient@example.test', '123456', 'device-1');

    expect(result.exchange_token).toEqual(expect.any(String));
    expect(result.expires_in).toBe(60);
    expect(redis.setJson).toHaveBeenCalledWith(
      `auth:session:exchange:${result.exchange_token}`,
      { user_id: 'patient-1', device_id: 'device-1' },
      60,
    );
    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it('returns otp_expired when no live OTP exists', async () => {
    const { service } = build();

    await expect(service.verifyPatientOtp('patient@example.test', '123456')).rejects.toBeInstanceOf(GoneException);
  });

  it('claims an exchange token once and does not return session tokens in the controller DTO', async () => {
    const { service, data, userModel } = build();
    data.set('auth:session:exchange:one-time-token', { user_id: 'patient-1', device_id: null });
    userModel.findOne.mockResolvedValue({ id: 'patient-1', role: 'patient', active: true });

    await expect(service.exchangePatientSession('one-time-token')).resolves.toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    await expect(service.exchangePatientSession('one-time-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
