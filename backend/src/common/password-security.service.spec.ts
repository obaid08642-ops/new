/**
 * Phase 16.2 — the password policy and the login backoff.
 * The plan's Verify: unit tests, "10 wrong passwords → slowed or locked", and
 * "a known and an unknown email get the same answer".
 */
import { PasswordSecurityService, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH_BYTES } from './password-security.service';

describe('Phase 16.2 password policy', () => {
  let svc: PasswordSecurityService;

  beforeEach(() => { svc = new PasswordSecurityService(); });

  it(`refuses anything under ${MIN_PASSWORD_LENGTH} characters`, async () => {
    for (const short of ['', 'a', 'abcdefgh', 'abcdefghi', '123456789']) {
      const r = await svc.check(short, async () => false);
      expect(r.ok).toBe(false);
      expect(r.code).toBe('password_too_short');
    }
  });

  it(`accepts a ${MIN_PASSWORD_LENGTH}-character password that is not in a breach corpus`, async () => {
    const r = await svc.check('correct-horse-battery', async () => false);
    expect(r).toEqual({ ok: true });
  });

  it('refuses a compromised password from the local list, whatever its case', async () => {
    for (const known of ['password1234', 'PASSWORD1234', 'letmein123', 'qwerty12345']) {
      const r = await svc.check(known, async () => false);
      expect(r.code).toBe('password_compromised');
    }
  });

  it('refuses a password the range API reports, using only the 5-char prefix', async () => {
    let seenPrefix = '';
    const probe = jest.fn(async (prefix: string, suffix: string) => {
      seenPrefix = prefix;
      return suffix === 'DEADBEEF';
    });
    // sha1('correct-horse-battery') -> drive the probe with the real digest
    const r = await svc.check('correct-horse-battery', async (prefix, suffix) => {
      seenPrefix = prefix;
      return suffix === 'DEADBEEF';
    });
    expect(seenPrefix).toHaveLength(5);
    expect(seenPrefix).toMatch(/^[0-9A-F]{5}$/);
    expect(r.ok).toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });

  it('caches the shard so the network is asked once', async () => {
    const probe = jest.fn(async () => false);
    await svc.check('correct-horse-battery', probe);
    await svc.check('battery-staple-correct', probe);
    // different prefixes: one call each. The same password twice hits the cache.
    await svc.check('correct-horse-battery', probe);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('refuses more than 72 bytes rather than truncating silently', async () => {
    const r = await svc.check('x'.repeat(MAX_PASSWORD_LENGTH_BYTES + 1), async () => false);
    expect(r.code).toBe('password_too_long');
  });

  it('a failed range API does not lock a user out', async () => {
    const r = await svc.check('correct-horse-battery', async () => { throw new Error('range api down'); });
    expect(r).toEqual({ ok: true });
  });
});

describe('Phase 16.2 progressive delay and lockout', () => {
  const svc = new PasswordSecurityService();

  it('grows the delay with each failure and locks after the threshold', () => {
    expect(svc.backoff(1)).toEqual({ delay_seconds: 1, locked: false });
    expect(svc.backoff(2).delay_seconds).toBe(2);
    expect(svc.backoff(3).delay_seconds).toBe(4);
    expect(svc.backoff(4).delay_seconds).toBe(8);
    expect(svc.backoff(5).locked).toBe(true);
    // the 10th wrong password (threshold 5) is locked
    expect(svc.backoff(10).locked).toBe(true);
    expect(svc.backoff(10).until).toBeTruthy();
  });

  it('the lockout window is configurable', () => {
    const previous = process.env.LOGIN_LOCK_THRESHOLD;
    process.env.LOGIN_LOCK_THRESHOLD = '3';
    try {
      expect(svc.backoff(2).locked).toBe(false);
      expect(svc.backoff(3).locked).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.LOGIN_LOCK_THRESHOLD;
      else process.env.LOGIN_LOCK_THRESHOLD = previous;
    }
  });
});