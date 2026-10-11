/**
 * Phase 16.3 — OTP abuse / SMS pumping.
 *
 * The plan's Verify, as tests: the 6th OTP for a number within an hour is
 * refused, a country code not on the list is refused, and one IP cannot fan
 * out across many numbers.
 */
import { OtpAbuseGuard, DEFAULT_COUNTRY_ALLOWLIST, MAX_OTP_PER_NUMBER_PER_HOUR, MAX_NUMBERS_PER_IP_PER_HOUR } from './otp-abuse.service';

/** An in-memory RedisService stand-in with just the methods the guard uses. */
function fakeRedis() {
  const counters = new Map<string, { n: number; exp?: number }>();
  const sets = new Map<string, Set<string>>();
  return {
    counters,
    sets,
    checkRateLimit: async (key: string, limit: number) => {
      const c = counters.get(key) ?? { n: 0 };
      c.n += 1;
      counters.set(key, c);
      return { allowed: c.n <= limit, remaining: Math.max(0, limit - c.n) };
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

  it('allows the first 5 OTPs for a number and refuses the 6th', async () => {
    const g = new OtpAbuseGuard(fakeRedis());
    for (let i = 0; i < MAX_OTP_PER_NUMBER_PER_HOUR; i += 1) {
      await expect(g.check('+966500000001', '1.1.1.1')).resolves.toEqual({ allowed: true });
    }
    await expect(g.check('+966500000001', '1.1.1.1')).resolves.toEqual({
      allowed: false, code: 'otp_rate_limited',
    });
  });

  it('a country code that is not served is refused before anything is sent', async () => {
    const g = new OtpAbuseGuard(fakeRedis());
    // +1 (North America) is deliberately not on the allow-list.
    await expect(g.check('+12025550143', '1.1.1.1')).resolves.toEqual({
      allowed: false, code: 'otp_country_not_served',
    });
    // And nothing was counted against a budget.
    expect((g as any).redis.counters.size).toBe(0);
  });

  it('serves every country on the allow-list', () => {
    const g = new OtpAbuseGuard(fakeRedis());
    for (const cc of DEFAULT_COUNTRY_ALLOWLIST) {
      expect(g.isServed(`${cc}500000000`)).toBe(true);
    }
    expect(g.isServed('+12025550143')).toBe(false);
  });

  it('one IP cannot fan out over many distinct numbers', async () => {
    const g = new OtpAbuseGuard(fakeRedis());
    const ip = '9.9.9.9';
    for (let i = 0; i < MAX_NUMBERS_PER_IP_PER_HOUR; i += 1) {
      const v = await g.check(`+9665000000${String(i).padStart(2, '0')}`, ip);
      expect(v.allowed).toBe(true);
    }
    const fan = await g.check('+96650000999', ip);
    expect(fan).toEqual({ allowed: false, code: 'otp_ip_number_limit' });
  });

  it('re-asking a number the IP already counted does not grow the set', async () => {
    const g = new OtpAbuseGuard(fakeRedis());
    const ip = '8.8.8.8';
    await g.check('+966500000111', ip);
    await g.check('+966500000111', ip);
    await g.check('+966500000111', ip);
    expect(((g as any).redis.sets.get(`sms:otp:ip:${ip}:numbers`))?.size).toBe(1);
  });

  it('two different IPs do not share a budget', async () => {
    const g = new OtpAbuseGuard(fakeRedis());
    for (let i = 0; i < MAX_NUMBERS_PER_IP_PER_HOUR; i += 1) {
      await g.check(`+9665000000${String(i).padStart(2, '0')}`, '1.1.1.1');
    }
    await expect(g.check('+96650000999', '1.1.1.1')).resolves.toEqual({ allowed: false, code: 'otp_ip_number_limit' });
    // A different address is unaffected.
    await expect(g.check('+96650000999', '2.2.2.2')).resolves.toEqual({ allowed: true });
  });

  it('an email identifier costs no SMS and is never refused here', async () => {
    const g = new OtpAbuseGuard(fakeRedis());
    for (let i = 0; i < 50; i += 1) {
      await expect(g.check('patient@example.com', '1.1.1.1')).resolves.toEqual({ allowed: true });
    }
    expect((g as any).redis.counters.size).toBe(0);
  });
});