import { ApiSecurityMiddleware } from './api-security.module';

describe('ApiSecurityMiddleware E2E isolation', () => {
  const originalE2E = process.env.E2E_MODE;
  const originalDisable = process.env.DISABLE_RATE_LIMIT;

  afterEach(() => {
    if (originalE2E === undefined) delete process.env.E2E_MODE;
    else process.env.E2E_MODE = originalE2E;
    if (originalDisable === undefined) delete process.env.DISABLE_RATE_LIMIT;
    else process.env.DISABLE_RATE_LIMIT = originalDisable;
  });

  it('bypasses rate checks only in the explicit disposable E2E mode', async () => {
    process.env.E2E_MODE = 'true';
    process.env.DISABLE_RATE_LIMIT = 'true';
    const sec = { checkRate: jest.fn(), blacklist: jest.fn(), logEvent: jest.fn() };
    const middleware = new ApiSecurityMiddleware(sec as any);
    const next = jest.fn();

    await middleware.use({} as any, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(sec.checkRate).not.toHaveBeenCalled();
  });

  it('keeps rate checks active when only the generic disable variable is set', async () => {
    delete process.env.E2E_MODE;
    process.env.DISABLE_RATE_LIMIT = 'true';
    const sec = { checkRate: jest.fn().mockResolvedValue({ allowed: true, className: 'default' }), blacklist: jest.fn(), logEvent: jest.fn() };
    const middleware = new ApiSecurityMiddleware(sec as any);
    const next = jest.fn();

    await middleware.use({ headers: {}, url: '/auth/login' } as any, {} as any, next);

    expect(sec.checkRate).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
