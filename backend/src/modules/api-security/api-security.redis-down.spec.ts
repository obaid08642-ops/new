import { ApiSecurityMiddleware, ApiSecurityService, LocalRateLimiter } from './api-security.module';

/** Sentry NABD-BACKEND-9/12/17/19: a Redis failure must never become a 5xx on `/api/*`; the limiter fails open. */
describe('api security with Redis failing', () => {
  const reqOf = (url = '/api/v1/public/product/ar/x') => ({ originalUrl: url, url, ip: '203.0.113.9', headers: {} }) as any;
  const failing = (message: string) => ({
    get: jest.fn().mockRejectedValue(new Error(message)),
    set: jest.fn().mockRejectedValue(new Error(message)),
    incr: jest.fn().mockRejectedValue(new Error(message)),
    expire: jest.fn().mockRejectedValue(new Error(message)),
    del: jest.fn().mockRejectedValue(new Error(message)),
  });
  const serviceWith = (client: unknown) => new ApiSecurityService({ getClient: () => client } as any, { collection: () => ({ insertOne: jest.fn() }) } as any);
  const prev = { NODE_ENV: process.env.NODE_ENV, DB_NAME: process.env.DB_NAME, DISABLE_RATE_LIMIT: process.env.DISABLE_RATE_LIMIT };
  beforeAll(() => { process.env.NODE_ENV = 'production'; delete process.env.DB_NAME; delete process.env.DISABLE_RATE_LIMIT; });
  afterAll(() => { for (const [k, v] of Object.entries(prev)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });

  it.each([
    ['Command timed out'],
    ['Stream isn\'t writeable and enableOfflineQueue options is false'],
    ['Connection is closed.'],
    ['MISCONF Errors writing to the AOF file: No space left on device'],
  ])('lets the request through when Redis fails: %s', async (message) => {
    const sec = serviceWith(failing(message));
    await expect(sec.checkRate(reqOf())).resolves.toMatchObject({ allowed: true });
  });

  it('the middleware calls next() instead of throwing', async () => {
    const mw = new ApiSecurityMiddleware(serviceWith(failing('Connection is closed.')));
    const next = jest.fn();
    await mw.use(reqOf(), { status: jest.fn(), setHeader: jest.fn() } as any, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('a failed blacklist write does not throw', async () => {
    await expect(serviceWith(failing('MISCONF')).blacklist('blacklist:ip:1.2.3.4', 'x')).resolves.toBeUndefined();
  });

  describe('sensitive classes keep a limit while Redis is down', () => {
    const cases: Array<[string, string, number]> = [
      ['login', '/api/v1/auth/login', 5],
      ['register', '/api/v1/auth/register', 5],
      ['OTP send', '/api/v1/auth/send-otp', 3],
      ['OTP verify', '/api/v1/auth/verify-otp', 3],
      ['password reset request', '/api/v1/auth/forgot-password', 3],
      ['password reset', '/api/v1/auth/reset-password', 5],
      ['payment', '/api/v1/payments/intent/order/abc', 20],
    ];
    it.each(cases)('%s: blocked after its per-minute budget, per instance', async (_n, url, budget) => {
      const sec = serviceWith(failing('Connection is closed.'));
      for (let i = 0; i < budget; i++) await expect(sec.checkRate(reqOf(url))).resolves.toMatchObject({ allowed: true });
      await expect(sec.checkRate(reqOf(url))).resolves.toMatchObject({ allowed: false, retryAfter: 60 });
    });

    it('the budget is per ip: another caller is not blocked', async () => {
      const sec = serviceWith(failing('MISCONF'));
      for (let i = 0; i < 4; i++) await sec.checkRate(reqOf('/api/v1/auth/send-otp'));
      const other = { ...reqOf('/api/v1/auth/send-otp'), ip: '198.51.100.7' };
      await expect(sec.checkRate(other)).resolves.toMatchObject({ allowed: true });
    });

    it('payment webhooks and general routes stay open', async () => {
      const sec = serviceWith(failing('Command timed out'));
      for (let i = 0; i < 200; i++) {
        await expect(sec.checkRate(reqOf('/api/v1/payments/webhook/stripe'))).resolves.toMatchObject({ allowed: true });
        await expect(sec.checkRate(reqOf('/api/v1/public/product/ar/x'))).resolves.toMatchObject({ allowed: true });
      }
    });

    it('the middleware answers 429 for a sensitive class over budget', async () => {
      const mw = new ApiSecurityMiddleware(serviceWith(failing('Connection is closed.')));
      const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn(), header: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis() };
      const next = jest.fn();
      for (let i = 0; i < 6; i++) await mw.use(reqOf('/api/v1/auth/login'), res, next);
      expect(next).toHaveBeenCalledTimes(5); // the login budget is 5 a minute
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    });
  });

  describe('LocalRateLimiter', () => {
    it('counts within a minute and resets after it', () => {
      let t = 1_000;
      const l = new LocalRateLimiter(() => t);
      expect([l.hit('k', 2), l.hit('k', 2), l.hit('k', 2)]).toEqual([true, true, false]);
      t += 61_000;
      expect(l.hit('k', 2)).toBe(true);
    });
    it('keeps memory bounded', () => {
      const l = new LocalRateLimiter(() => 5);
      for (let i = 0; i < LocalRateLimiter.MAX_KEYS + 500; i++) l.hit(`k${i}`, 5);
      expect((l as any).hits.size).toBeLessThanOrEqual(LocalRateLimiter.MAX_KEYS);
    });
  });
});
