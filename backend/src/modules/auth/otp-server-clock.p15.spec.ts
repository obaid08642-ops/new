/**
 * 15.9 — Server time is used for OTP expiry, so a wrong device clock changes
 * nothing.
 *
 * Both OTP paths (patient-web and generic) store only a bcrypt hash under a
 * server-side Redis EX TTL and verify by re-reading the store. The request
 * carries (identifier, code, deviceId) — no timestamps — so there is no
 * client-clock input that could shift expiry. The mock Redis below models
 * real EX semantics (expiry against the server clock, i.e. Date.now()), and
 * jest fake timers move that server clock:
 *   - server −1 day from issue → still valid (backward skew is harmless);
 *   - server +6 min (past the 300 s TTL) → otp_expired;
 *   - server +1 day → otp_expired (correct server-side expiry);
 *   - no live entry → otp_expired (pins the production absent-entry branch).
 */
import { GoneException } from '@nestjs/common';
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

const OTP_TTL_SECONDS = 300;

function ttlRedis() {
  const data = new Map<string, { value: any; exp: number }>();
  const read = (key: string) => {
    const rec = data.get(key);
    if (!rec) return null;
    if (Date.now() >= rec.exp) {
      data.delete(key);
      return null;
    }
    return rec.value;
  };
  return {
    data,
    checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 1 }),
    exists: jest.fn().mockResolvedValue(false),
    setJson: jest.fn(async (key: string, value: any, ttl = OTP_TTL_SECONDS) => {
      data.set(key, { value, exp: Date.now() + ttl * 1000 });
    }),
    getJson: jest.fn(async (key: string) => read(key)),
    set: jest.fn(async (key: string, value: string, ttl = OTP_TTL_SECONDS) => {
      data.set(key, { value, exp: Date.now() + ttl * 1000 });
    }),
    get: jest.fn(async (key: string) => read(key)),
    del: jest.fn(async (key: string) => { data.delete(key); }),
    ttl: jest.fn(async (key: string) => {
      const rec = data.get(key);
      if (!rec) return -2;
      return Math.max(0, Math.ceil((rec.exp - Date.now()) / 1000));
    }),
  };
}

const build = () => {
  const redis = ttlRedis();
  const service = new AuthService(
    { findOne: jest.fn() } as any,
    {} as any,
    { sign: jest.fn() } as any,
    { emit: jest.fn() } as any,
    redis as any,
    passwordSecurityStub as any,
    httpStub as any,
    undefined, undefined, undefined, undefined, undefined,
    { sendOtp: jest.fn(async () => ({ ok: true })) } as any,
    undefined,
    smsFraudStub as any,
  );
  return { redis, service };
};

const OTP_KEY = 'auth:otp:patient:patient@example.test';

async function liveEntry(redis: ReturnType<typeof ttlRedis>) {
  await redis.setJson(OTP_KEY, { code_hash: await bcrypt.hash('123456', 4), user_id: 'patient-1', attempts: 0 }, OTP_TTL_SECONDS);
}

describe('15.9 OTP expiry follows the server clock (mocked Redis EX TTL)', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('verifies while the server-side TTL is live', async () => {
    jest.setSystemTime(new Date('2027-03-01T12:00:00Z'));
    const { service } = build();
    const redis = (service as any).redisService as ReturnType<typeof ttlRedis>;
    await liveEntry(redis);
    await expect(service.verifyPatientOtp('patient@example.test', '123456', 'device-1')).resolves.toEqual(
      expect.objectContaining({ expires_in: 60 }),
    );
  });

  it('still verifies when the server clock runs 1 day behind issue (backward skew harmless)', async () => {
    jest.setSystemTime(new Date('2027-03-01T12:00:00Z'));
    const { service } = build();
    const redis = (service as any).redisService as ReturnType<typeof ttlRedis>;
    await liveEntry(redis);
    jest.setSystemTime(new Date('2027-02-28T12:00:00Z')); // server −1 day
    await expect(service.verifyPatientOtp('patient@example.test', '123456', 'device-1')).resolves.toEqual(
      expect.objectContaining({ expires_in: 60 }),
    );
  });

  it('rejects with otp_expired once the server-side TTL lapses (+6 min)', async () => {
    jest.setSystemTime(new Date('2027-03-01T12:00:00Z'));
    const { service } = build();
    const redis = (service as any).redisService as ReturnType<typeof ttlRedis>;
    await liveEntry(redis);
    jest.setSystemTime(new Date('2027-03-01T12:06:00Z'));
    await expect(service.verifyPatientOtp('patient@example.test', '123456', 'device-1')).rejects.toBeInstanceOf(GoneException);
  });

  it('rejects with otp_expired with the server clock 1 day ahead (correct server-side expiry)', async () => {
    jest.setSystemTime(new Date('2027-03-01T12:00:00Z'));
    const { service } = build();
    const redis = (service as any).redisService as ReturnType<typeof ttlRedis>;
    await liveEntry(redis);
    jest.setSystemTime(new Date('2027-03-02T12:00:00Z')); // server +1 day
    await expect(service.verifyPatientOtp('patient@example.test', '123456', 'device-1')).rejects.toBeInstanceOf(GoneException);
  });

  it('rejects with otp_expired when no live entry exists', async () => {
    jest.setSystemTime(new Date('2027-03-01T12:00:00Z'));
    const { service } = build();
    await expect(service.verifyPatientOtp('patient@example.test', '123456', 'device-1')).rejects.toBeInstanceOf(GoneException);
  });

  it('issues patient OTPs with a 300 s server-side TTL', async () => {
    const userModel = { findOne: jest.fn(async () => ({ id: 'patient-1', email: 'patient@example.test', active: true })) };
    const redis = ttlRedis();
    const service = new AuthService(
      userModel as any, {} as any, { sign: jest.fn() } as any, { emit: jest.fn() } as any,
      redis as any, passwordSecurityStub as any, httpStub as any,
      undefined, undefined, undefined, undefined, undefined,
      { sendOtp: jest.fn(async () => ({ ok: true })) } as any,
      undefined,
      smsFraudStub as any,
    );
    await service.requestPatientOtp('patient@example.test');
    expect(redis.setJson).toHaveBeenCalledWith(OTP_KEY, expect.objectContaining({ user_id: 'patient-1' }), 300);
  });
});
