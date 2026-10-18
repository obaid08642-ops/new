/**
 * Phase 16.2 — the password policy (the lockout is login-lock.service.spec.ts, the same-answer rule is auth-login-16-2.spec.ts).
 */
import { PasswordSecurityService, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH_BYTES, enforcePasswordPolicy } from './password-security.service';

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

  it('an injected probe answers for itself, once per check (the kept shard is tested with the real lookup below)', async () => {
    const probe = jest.fn(async () => false);
    await svc.check('correct-horse-battery', probe);
    await svc.check('battery-staple-correct', probe);
    expect(probe).toHaveBeenCalledTimes(2);
    expect(probe.mock.calls[0]).toEqual([expect.stringMatching(/^[0-9A-F]{5}$/), expect.stringMatching(/^[0-9A-F]{35}$/)]);
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

describe('Phase 16.2 the breached-password range lookup', () => {
  const sha1 = (v: string) => require('crypto').createHash('sha1').update(v, 'utf8').digest('hex').toUpperCase() as string;
  const previous = global.fetch;
  // the unit-test setup turns the lookup off; these tests turn it on and put it back
  beforeEach(() => { process.env.PASSWORD_BREACH_LOOKUP = 'on'; });
  afterEach(() => { global.fetch = previous; process.env.PASSWORD_BREACH_LOOKUP = 'off'; });

  it('keeps the whole shard, so a second password with the same five-character prefix is still checked against it', async () => {
    const svc = new PasswordSecurityService();
    const pw = 'a-perfectly-ordinary-passphrase';
    const hash = sha1(pw);
    const other = 'F'.repeat(35); // another suffix in the same shard
    const fetchMock = jest.fn(async (_url: string) => ({ ok: true, text: async () => `${hash.slice(5)}:12\r\n${other}:3\r\n` }));
    global.fetch = fetchMock as any;
    expect(await svc.check(pw)).toEqual({ ok: false, code: 'password_compromised' });
    // the second lookup is served from the kept shard: no new request, and its other member is known
    expect(await svc.check(pw)).toEqual({ ok: false, code: 'password_compromised' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
  });

  it('only the first five characters of the hash are sent, and a password not in the shard passes', async () => {
    const svc = new PasswordSecurityService();
    global.fetch = (async () => ({ ok: true, text: async () => 'ABCDEF:1\r\n' })) as any;
    expect(await svc.check('another-unremarkable-passphrase')).toEqual({ ok: true });
  });

  it('PASSWORD_BREACH_LOOKUP=off skips the network (the unit tests use it) but not the local list', async () => {
    process.env.PASSWORD_BREACH_LOOKUP = 'off'; // (the setup already did; stated here because the test depends on it)
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;
    const svc = new PasswordSecurityService();
    expect(await svc.check('something-fresh-123')).toEqual({ ok: true });
    expect(await svc.check('Password1234')).toEqual({ ok: false, code: 'password_compromised' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Phase 16.2 enforcePasswordPolicy (every place a person chooses a password)', () => {
  it('refuses a short, an over-long and a compromised password with the code, and accepts a long passphrase', async () => {
    await expect(enforcePasswordPolicy('short-1')).rejects.toMatchObject({ response: { code: 'password_too_short' } });
    await expect(enforcePasswordPolicy('x'.repeat(80))).rejects.toMatchObject({ response: { code: 'password_too_long' } });
    await expect(enforcePasswordPolicy('letmein123')).rejects.toMatchObject({ response: { code: 'password_compromised' } });
    await expect(enforcePasswordPolicy(undefined)).rejects.toMatchObject({ response: { code: 'password_too_short' } });
    await expect(enforcePasswordPolicy('correct horse battery staple')).resolves.toBeUndefined();
  });
});
