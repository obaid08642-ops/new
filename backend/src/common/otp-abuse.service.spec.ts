/**
 * Phase 16.3 — OTP abuse / SMS pumping.
 *
 * The plan's Verify, as tests: the 6th OTP for a number within an hour is
 * refused, a country code not on the list is refused, and one IP cannot fan
 * out across many numbers.
 *
 * The normalisation tests matter most: a limit keyed on the raw string would be
 * bypassed by re-spelling the same number.
 */
import {
  OtpAbuseGuard,
  DEFAULT_COUNTRY_ALLOWLIST,
  MAX_OTP_PER_NUMBER_PER_HOUR,
  MAX_NUMBERS_PER_IP_PER_HOUR,
  DAILY_SMS_BUDGET,
} from './otp-abuse.service';

/** An in-memory RedisService stand-in with just the methods the guard uses. */
function fakeRedis() {
  const counters = new Map<string, { n: number }>();
  const strings = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  return {
    counters,
    strings,
    sets,
    checkRateLimit: async (key: string, limit: number) => {
      const c = counters.get(key) ?? { n: 0 };
      c.n += 1;
      counters.set(key, c);
      return { allowed: c.n <= limit, remaining: Math.max(0, limit - c.n) };
    },
    get: async (key: string) => strings.get(key) ?? null,
    set: async (key: string, value: string) => { strings.set(key, value); return 'OK'; },
    incr: async (key: string) => {
      const n = Number(strings.get(key) ?? 0) + 1;
      strings.set(key, String(n));
      return n;
    },
    sadd: async (key: string, ...m: string[]) => {
      const s = sets.get(key) ?? new Set<string>();
      for (const x of m) s.add(x);
      sets.set(key, s);
    },
    sismember: async (key: string, m: string) => !!sets.get(key)?.has(m),
    smembers: async (key: string) => Array.from(sets.get(key) ?? []),
    expire: async () => undefined,
  } as any;
}

describe('Phase 16.3 OTP abuse guard', () => {
  const prev = { ...process.env };
  afterEach(() => { process.env = { ...prev }; });

  describe('E.164 normalisation happens before any limit', () => {
    it('reduces every spelling of a Saudi number to one E.164 form', () => {
      const g = new OtpAbuseGuard(fakeRedis());
      const expected = '+966501234567';
      for (const spelling of [
        '+966501234567',
        '966501234567',
        '00966501234567',
        '0501234567',
        '050 123 4567',
        '050-123-4567',
        '050.123.4567',
        '050(123)4567',
        '+966 50 123 4567',
      ]) {
        expect(`${spelling} -> ${g.toE164(spelling)}`).toBe(`${spelling} -> ${expected}`);
      }
    });

    it('a leading national trunk zero becomes the default country', () => {
      const g = new OtpAbuseGuard(fakeRedis());
      expect(g.toE164('0501234567')).toBe('+966501234567');
      expect(g.toE164('00966501234567')).toBe('+966501234567');
    });

    it('a bare international number gets its + (UK example)', () => {
      const g = new OtpAbuseGuard(fakeRedis());
      expect(g.toE164('00447712345678')).toBe('+447712345678');
      expect(g.toE164('447712345678')).toBe('+447712345678');
    });

    it('a number with no + that starts with a country code is accepted', () => {
      const g = new OtpAbuseGuard(fakeRedis());
      // 966 is a country code, not a subscriber number.
      expect(g.toE164('966501234567')).toBe('+966501234567');
      expect(g.toE164('201001234567')).toBe('+201001234567');
    });

    it('rejects anything that is not a usable number instead of passing it on', () => {
      const g = new OtpAbuseGuard(fakeRedis());
      for (const bad of ['', '   ', 'abc', '12345', '++966501234567', '05', '+9665012345678901234', 'null']) {
        expect(`${bad} -> ${g.toE164(bad)}`).toBe(`${bad} -> null`);
      }
    });

    it('a number that cannot be normalised is refused, not silently passed', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      await expect(g.check('not-a-number')).resolves.toEqual({
        allowed: false, code: 'otp_invalid_identifier',
      });
    });
  });

  describe('limits are keyed on the canonical form', () => {
    it('re-spelling the same number does not buy a fresh counter', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      const spellings = ['+966501234567', '966501234567', '0501234567', '050 123 4567', '00966501234567'];
      for (const s of spellings.slice(0, MAX_OTP_PER_NUMBER_PER_HOUR)) {
        await expect(g.check(s, '1.1.1.1')).resolves.toEqual({ allowed: true });
      }
      // The sixth attempt is refused no matter how it is written.
      for (const s of spellings) {
        await expect(g.check(s, '1.1.1.1')).resolves.toEqual({
          allowed: false, code: 'otp_rate_limited',
        });
      }
    });
  });

  describe('country allow-list', () => {
    it('a country code that is not served is refused', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      await expect(g.check('+12025550143', '1.1.1.1')).resolves.toEqual({
        allowed: false, code: 'otp_country_not_served',
      });
    });

    it('serves every country on the allow-list', () => {
      const g = new OtpAbuseGuard(fakeRedis());
      for (const cc of DEFAULT_COUNTRY_ALLOWLIST) {
        expect(g.isServed(`${cc}500000000`)).toBe(true);
      }
      expect(g.isServed('+12025550143')).toBe(false);
    });
  });

  describe('per-IP fan-out', () => {
    it('one IP cannot fan out over many distinct numbers', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      const ip = '9.9.9.9';
      for (let i = 0; i < MAX_NUMBERS_PER_IP_PER_HOUR; i += 1) {
        expect((await g.check(`+9665000000${String(i).padStart(2, '0')}`, ip)).allowed).toBe(true);
      }
      await expect(g.check('+966500000999', ip)).resolves.toEqual({
        allowed: false, code: 'otp_ip_number_limit',
      });
    });

    it('re-asking a number the IP already counted does not grow the set', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      const ip = '8.8.8.8';
      await g.check('+966500000111', ip);
      await g.check('+966500000111', ip);
      await g.check('0500000111', ip);
      expect(((g as any).redis.sets.get(`sms:otp:ip:${ip}:numbers`))?.size).toBe(1);
    });

    it('two different IPs do not share a budget', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      for (let i = 0; i < MAX_NUMBERS_PER_IP_PER_HOUR; i += 1) {
        await g.check(`+9665000000${String(i).padStart(2, '0')}`, '1.1.1.1');
      }
      await expect(g.check('+966500000999', '1.1.1.1')).resolves.toEqual({ allowed: false, code: 'otp_ip_number_limit' });
      await expect(g.check('+966500000999', '2.2.2.2')).resolves.toEqual({ allowed: true });
    });
  });

  describe('daily budget is read-only until an SMS is really sent', () => {
    it('check() never spends the budget', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      for (let i = 0; i < 50; i += 1) {
        await g.check(`+9665000000${String(i).padStart(2, '0')}`, '3.3.3.3');
      }
      expect(await g.remainingDailyBudget()).toBe(DAILY_SMS_BUDGET);
    });

    it('a refused request costs nothing', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      await g.check('+12025550143', '4.4.4.4');   // country not served
      await g.check('not-a-number', '4.4.4.4');   // unnormalisable
      expect(await g.remainingDailyBudget()).toBe(DAILY_SMS_BUDGET);
    });

    it('recordSmsSent spends one, and is the only thing that does', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      expect(await g.remainingDailyBudget()).toBe(DAILY_SMS_BUDGET);
      await expect(g.recordSmsSent()).resolves.toBe(true);
      expect(await g.remainingDailyBudget()).toBe(DAILY_SMS_BUDGET - 1);
    });

    it('once the budget is gone, OTP sends are refused', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      await (g as any).redis.set('sms:daily_budget:used', String(DAILY_SMS_BUDGET));
      await expect(g.check('+966501234567', '5.5.5.5')).resolves.toEqual({
        allowed: false, code: 'otp_daily_budget_exhausted',
      });
    });

    it('the budget is the LAST check, so a country refusal never reaches it', async () => {
      const g = new OtpAbuseGuard(fakeRedis());
      // Budget is spent AND the country is not served: the country is reported,
      // which is only true if the budget check runs after it.
      await (g as any).redis.set('sms:daily_budget:used', String(DAILY_SMS_BUDGET));
      await expect(g.check('+12025550143', '6.6.6.6')).resolves.toEqual({
        allowed: false, code: 'otp_country_not_served',
      });
    });
  });

  it('an email identifier costs no SMS and is never refused here', async () => {
    const g = new OtpAbuseGuard(fakeRedis());
    for (let i = 0; i < 50; i += 1) {
      await expect(g.check('patient@example.com', '1.1.1.1')).resolves.toEqual({ allowed: true });
    }
    expect((g as any).redis.counters.size).toBe(0);
  });
});