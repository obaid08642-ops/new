import { ServiceUnavailableException } from '@nestjs/common';
import { AdminPharmacyController } from './pharmacy.controllers';

describe('AdminPharmacyController test seed guard', () => {
  const seedSvc = {
    seed: jest.fn(),
    seedSampleOrder: jest.fn(),
  };
  const controller = new AdminPharmacyController(seedSvc as any, {} as any, {} as any, {} as any);
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowSeed = process.env.ALLOW_TEST_SEED;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalAllowSeed === undefined) delete process.env.ALLOW_TEST_SEED;
    else process.env.ALLOW_TEST_SEED = originalAllowSeed;
  });

  it('returns 503 and never creates seed records outside an explicitly enabled test environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_TEST_SEED = 'true';

    expect(() => controller.seed({ id: 'admin-1', role: 'admin' })).toThrow(ServiceUnavailableException);
    expect(() => controller.sampleOrder({ id: 'admin-1', role: 'admin' }, {})).toThrow(ServiceUnavailableException);
    expect(seedSvc.seed).not.toHaveBeenCalled();
    expect(seedSvc.seedSampleOrder).not.toHaveBeenCalled();
  });

  it('allows isolated seed helpers only when both test switches are explicit', () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_TEST_SEED = 'true';
    seedSvc.seed.mockReturnValue({ ok: true });
    seedSvc.seedSampleOrder.mockReturnValue({ id: 'sample-order-1' });

    expect(controller.seed({ id: 'admin-1', role: 'admin' })).toEqual({ ok: true });
    expect(controller.sampleOrder({ id: 'patient-1', role: 'admin' }, {})).toEqual({ id: 'sample-order-1' });
  });
});
