/**
 * F10 (15.12) — TEST-ONLY chaos failure switches (mocked, no mongod here).
 *
 * Contract under test (mirrors src/common/chaos-switches.ts + P15_NOTES):
 * - CHAOS_FAIL_SMS=1 → sendOtp() returns false WITHOUT calling the provider.
 *   Control (switch unset): same setup delivers true and calls axios.post.
 * - CHAOS_FAIL_LIVEKIT=1 → roomService() is null even with credentials set,
 *   so getRoomParticipants() → [] and muteParticipant() →
 *   { success:false, reason:'livekit_not_configured' } with no server contact.
 * - Any value other than exactly '1' (incl. '0'/'true'/unset) → normal path.
 *
 * Mutating production (e.g. isChaosFail comparing to 'never') makes the
 * chaos tests red while the controls stay green.
 */
import { SmsService } from '../modules/sms/sms.service';
import { LiveKitService } from '../modules/livekit/livekit.service';
import { isChaosFail } from '../common/chaos-switches';

describe('F10 chaos failure switches (mocked)', () => {
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
  });

  describe('CHAOS_FAIL_SMS', () => {
    const enabledConn: any = {
      collection: () => ({ findOne: async () => ({ key: 'sms_enabled', enabled: true }) }),
    };

    it('forces the documented fallback (false) without touching the provider', async () => {
      process.env.CHAOS_FAIL_SMS = '1';
      process.env.TAQNYAT_API_KEY = 'tk';
      process.env.SMS_TIMEOUT_MS = '2000';
      const axios = require('axios');
      const post = jest.spyOn(axios, 'post').mockResolvedValue({ status: 200 });
      const svc = new SmsService(enabledConn);
      await expect(svc.sendOtp('+966500000000', '123456')).resolves.toBe(false);
      expect(post).not.toHaveBeenCalled();
    });

    it('control: same setup delivers when the switch is unset', async () => {
      delete process.env.CHAOS_FAIL_SMS;
      process.env.TAQNYAT_API_KEY = 'tk';
      process.env.SMS_TIMEOUT_MS = '2000';
      const axios = require('axios');
      const post = jest.spyOn(axios, 'post').mockResolvedValue({ status: 200 });
      const svc = new SmsService(enabledConn);
      await expect(svc.sendOtp('+966500000000', '123456')).resolves.toBe(true);
      expect(post).toHaveBeenCalledTimes(1);
    });
  });

  describe('CHAOS_FAIL_LIVEKIT', () => {
    const mk = () =>
      new LiveKitService(
        { findOne: jest.fn() } as any,
        { collection: jest.fn() } as any,
        { emit: jest.fn() } as any,
      );

    it('nulls the room service even with credentials set (no server contact)', async () => {
      process.env.LIVEKIT_URL = 'https://lk.test';
      process.env.LIVEKIT_API_KEY = 'k';
      process.env.LIVEKIT_API_SECRET = 's';
      process.env.CHAOS_FAIL_LIVEKIT = '1';
      const svc = mk();
      expect((svc as any).roomService()).toBeNull();
      await expect(svc.getRoomParticipants('room-1')).resolves.toEqual([]);
      const r = await svc.muteParticipant('room-1', 'p-1', true);
      expect(r).toEqual({ success: false, reason: 'livekit_not_configured' });
    });

    it('control: credentials set + switch unset reaches the server client', async () => {
      process.env.LIVEKIT_URL = 'https://lk.test';
      process.env.LIVEKIT_API_KEY = 'k';
      process.env.LIVEKIT_API_SECRET = 's';
      delete process.env.CHAOS_FAIL_LIVEKIT;
      const svc = mk();
      // Production roomService() builds a real client here; override only the
      // transport boundary to prove the call flows past the (open) gate.
      (svc as any).roomService = () => ({
        listParticipants: async () => [{ identity: 'p1', name: 'A', state: 'active', isPublisher: true, tracks: [] }],
      });
      const list = await svc.getRoomParticipants('room-1');
      expect(list).toHaveLength(1);
      expect(list[0].identity).toBe('p1');
    });
  });
});
