import { StepUpService } from './step-up.guard';
import { Reflector } from '@nestjs/core';

/**
 * X3: step-up tokens must survive across service instances (workers).
 * Production runs one Node worker per CPU; a token issued by worker A
 * must verify on worker B. With a process-local Map this fails randomly.
 */
describe('StepUpService Redis storage (X3)', () => {
  const makeService = () => {
    const passkeyModel = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) } as any;
    return new StepUpService(passkeyModel);
  };

  it('a token issued by one instance verifies on another', async () => {
    const issuer = makeService();
    const verifier = makeService();

    const token = await issuer.issue('admin-1', 'PUT:/api/v1/admin/loyalty/config');

    // Simulate a different worker: new service instance, no shared memory.
    const ok = await verifier.verify('admin-1', 'PUT:/api/v1/admin/loyalty/config', token);
    expect(ok).toBe(true);
  });

  it('a token is single-use: the second verify fails', async () => {
    const issuer = makeService();
    const verifier = makeService();

    const token = await issuer.issue('admin-1', 'PUT:/api/v1/admin/loyalty/config');

    expect(await verifier.verify('admin-1', 'PUT:/api/v1/admin/loyalty/config', token)).toBe(true);
    expect(await verifier.verify('admin-1', 'PUT:/api/v1/admin/loyalty/config', token)).toBe(false);
  });

  it('a token for a different action fails', async () => {
    const issuer = makeService();
    const verifier = makeService();

    const token = await issuer.issue('admin-1', 'PUT:/api/v1/admin/loyalty/config');

    expect(await verifier.verify('admin-1', 'DELETE:/api/v1/admin/users/1', token)).toBe(false);
  });

  it('a token for a different user fails', async () => {
    const issuer = makeService();
    const verifier = makeService();

    const token = await issuer.issue('admin-1', 'PUT:/api/v1/admin/loyalty/config');

    expect(await verifier.verify('admin-2', 'PUT:/api/v1/admin/loyalty/config', token)).toBe(false);
  });
});
