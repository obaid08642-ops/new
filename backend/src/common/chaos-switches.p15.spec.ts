/**
 * 15.11 / 15.12 — chaos failure switches (mocked, no mongod here).
 *
 * Each switch must produce the DOCUMENTED degraded answer, so a drill that
 * drives them asserts a real behaviour rather than an accidental error:
 * - CHAOS_FAIL_SMS=1 → sendOtp() returns false WITHOUT calling the provider.
 *   Control (switch unset): the same setup delivers and calls axios.post.
 * - CHAOS_FAIL_LIVEKIT=1 → roomService() is null even with credentials set, so
 *   getRoomParticipants() → [] and muteParticipant() → livekit_not_configured,
 *   with no server contact.
 * - Any value other than exactly '1' → the normal path.
 *
 * The PRODUCTION GUARD is the part the old tree got wrong (review c9f6368c):
 * the switches were gated on the env var alone, so one stray variable in
 * production silently disabled every OTP SMS and all LiveKit room control.
 * `isChaosFail` must be false there whatever the env says, and the boot must
 * refuse to start with one set.
 */
import { SmsService } from '../modules/sms/sms.service';
import { LiveKitService } from '../modules/livekit/livekit.service';
import { isChaosFail } from './chaos-switches';
import { validateEnvironment } from '../config/env.validation';

describe('15.11 chaos failure switches (mocked)', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  describe('isChaosFail', () => {
    it("fires only on the exact string '1'", () => {
      process.env.CHAOS_FAIL_SMS = '1';
      expect(isChaosFail('sms')).toBe(true);
      process.env.CHAOS_FAIL_SMS = 'true';
      expect(isChaosFail('sms')).toBe(false);
      process.env.CHAOS_FAIL_SMS = '0';
      expect(isChaosFail('sms')).toBe(false);
      delete process.env.CHAOS_FAIL_SMS;
      expect(isChaosFail('sms')).toBe(false);
      process.env.CHAOS_FAIL_LIVEKIT = '1';
      expect(isChaosFail('livekit')).toBe(true);
      delete process.env.CHAOS_FAIL_LIVEKIT;
      expect(isChaosFail('livekit')).toBe(false);
    });

    it('never fires in production, whatever the environment says', () => {
      process.env.NODE_ENV = 'production';
      process.env.CHAOS_FAIL_SMS = '1';
      process.env.CHAOS_FAIL_LIVEKIT = '1';
      expect(isChaosFail('sms')).toBe(false);
      expect(isChaosFail('livekit')).toBe(false);
    });
  });

  describe('the production guard on boot', () => {
    const prod = {
      NODE_ENV: 'production',
      MONGO_URL: 'mongodb://x',
      REDIS_URL: 'redis://x',
      JWT_SECRET: 'a'.repeat(32),
      ALLOWED_ORIGINS: 'https://nabd.plus',
    };

    it('accepts a clean production environment', () => {
      expect(() => validateEnvironment({ ...prod })).not.toThrow();
    });

    it('refuses to boot when a chaos switch is set in production', () => {
      expect(() => validateEnvironment({ ...prod, CHAOS_FAIL_SMS: '1' })).toThrow(/CHAOS_FAIL_SMS/);
      expect(() => validateEnvironment({ ...prod, CHAOS_FAIL_LIVEKIT: '1' })).toThrow(/CHAOS_FAIL_LIVEKIT/);
    });

    it('allows the same switch outside production (it is how the drills run)', () => {
      expect(() => validateEnvironment({ NODE_ENV: 'development', CHAOS_FAIL_SMS: '1' })).not.toThrow();
    });
  });

  describe('CHAOS_FAIL_SMS', () => {
    const enabledConn: any = {
      collection: () => ({ findOne: async () => ({ key: 'sms_enabled', enabled: true }) }),
    };

    it('forces the documented fallback (false) without touching the provider', async () => {
      process.env.CHAOS_FAIL_SMS = '1';
      process.env.TAQNYAT_API_KEY = 'tk';
      const axios = require('axios');
      const post = jest.spyOn(axios, 'post').mockResolvedValue({ status: 200 });
      const svc = new SmsService(enabledConn);
      await expect(svc.sendOtp('+966500000000', '123456')).resolves.toBe(false);
      expect(post).not.toHaveBeenCalled();
    });

    it('control: the same setup delivers when the switch is unset', async () => {
      delete process.env.CHAOS_FAIL_SMS;
      process.env.TAQNYAT_API_KEY = 'tk';
      const axios = require('axios');
      const post = jest.spyOn(axios, 'post').mockResolvedValue({ status: 200 });
      const svc = new SmsService(enabledConn);
      await expect(svc.sendOtp('+966500000000', '123456')).resolves.toBe(true);
      expect(post).toHaveBeenCalledTimes(1);
    });
  });

  describe('CHAOS_FAIL_LIVEKIT', () => {
    const creds = () => {
      process.env.LIVEKIT_URL = 'https://lk.example';
      process.env.LIVEKIT_API_KEY = 'key';
      process.env.LIVEKIT_API_SECRET = 'secret';
    };

    it('answers with the unconfigured answers and contacts no server', async () => {
      process.env.CHAOS_FAIL_LIVEKIT = '1';
      creds();
      const svc = new LiveKitService({} as any, {} as any, {} as any);
      await expect(svc.getRoomParticipants('room-1')).resolves.toEqual([]);
      await expect(svc.muteParticipant('room-1', 'p-1', true)).resolves.toEqual({
        success: false,
        reason: 'livekit_not_configured',
      });
      // Removal is a moderation action: it fails visibly with a 409, never a 5xx.
      await expect(svc.removeParticipant('room-1', 'p-1')).rejects.toMatchObject({
        status: 409,
        response: { reason: 'livekit_not_configured' },
      });
    });
  });
});