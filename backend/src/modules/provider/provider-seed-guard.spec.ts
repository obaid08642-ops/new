import { ServiceUnavailableException } from '@nestjs/common';
import { ProviderDashboardController } from './provider.controllers';

// R71: POST /provider/seed planted schedules (skipping admin approval) and cross-type capabilities for any provider.
describe('provider demo seed is test-mode only (R71)', () => {
  const seedSvc = { seed: jest.fn(async () => ({ seeded: true })), resetSeed: jest.fn(async () => ({ reset: true })) };
  const ctrl = new ProviderDashboardController({} as any, seedSvc as any);
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; seedSvc.seed.mockClear(); seedSvc.resetSeed.mockClear(); });

  it('refuses outside NODE_ENV=test + ALLOW_TEST_SEED=true and never touches data', () => {
    for (const [nodeEnv, allow] of [['production', 'true'], ['development', 'true'], ['test', undefined]]) {
      process.env.NODE_ENV = nodeEnv as string;
      if (allow) process.env.ALLOW_TEST_SEED = allow; else delete process.env.ALLOW_TEST_SEED;
      expect(() => ctrl.seed({ id: 'p1', role: 'provider' })).toThrow(ServiceUnavailableException);
      expect(() => ctrl.seedReset({ id: 'p1', role: 'provider' })).toThrow(ServiceUnavailableException);
    }
    expect(seedSvc.seed).not.toHaveBeenCalled();
    expect(seedSvc.resetSeed).not.toHaveBeenCalled();
  });

  it('runs in explicit test mode', async () => {
    process.env.NODE_ENV = 'test'; process.env.ALLOW_TEST_SEED = 'true';
    await expect(ctrl.seed({ id: 'p1', role: 'provider' })).resolves.toEqual({ seeded: true });
  });
});
