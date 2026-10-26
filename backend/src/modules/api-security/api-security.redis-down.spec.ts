import { ApiSecurityMiddleware, ApiSecurityService } from './api-security.module';

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
});
