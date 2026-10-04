import { StepUpGuard, StepUpService } from './step-up.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';

describe('StepUpGuard (X2)', () => {
  const makeGuard = (stepUp: StepUpService, passkeyModel: any, isStepUp = true) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(isStepUp) } as any;
    return new StepUpGuard(reflector, stepUp, passkeyModel);
  };

  const makeReq = (headers: Record<string, string> = {}) => ({ headers, method: 'POST', path: '/test', user: { id: 'admin-1' } });
  const makeCtx = (req: any) => ({
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any);

  it('rejects without a step-up token (403)', async () => {
    const stepUp = { verify: jest.fn().mockReturnValue(false) } as any;
    const passkeyModel = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ user_id: 'admin-1' }) }) } as any;
    const guard = makeGuard(stepUp, passkeyModel);
    await expect(guard.canActivate(makeCtx(makeReq()))).rejects.toThrow(ForbiddenException);
  });

  it('rejects with an invalid step-up token (403)', async () => {
    const stepUp = { verify: jest.fn().mockReturnValue(false) } as any;
    const passkeyModel = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ user_id: 'admin-1' }) }) } as any;
    const guard = makeGuard(stepUp, passkeyModel);
    await expect(guard.canActivate(makeCtx(makeReq({ 'x-step-up-token': 'bad' })))).rejects.toThrow(ForbiddenException);
  });

  it('allows with a valid step-up token', async () => {
    const stepUp = { verify: jest.fn().mockReturnValue(true) } as any;
    const passkeyModel = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ user_id: 'admin-1' }) }) } as any;
    const guard = makeGuard(stepUp, passkeyModel);
    await expect(guard.canActivate(makeCtx(makeReq({ 'x-step-up-token': 'good' })))).resolves.toBe(true);
  });

  it('skips the check when the route is not marked @StepUp()', async () => {
    const stepUp = { verify: jest.fn() } as any;
    const passkeyModel = { findOne: jest.fn() } as any;
    const guard = makeGuard(stepUp, passkeyModel, false);
    await expect(guard.canActivate(makeCtx(makeReq()))).resolves.toBe(true);
    expect(stepUp.verify).not.toHaveBeenCalled();
  });
});
