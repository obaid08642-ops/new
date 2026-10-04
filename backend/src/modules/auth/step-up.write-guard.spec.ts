// R23 live gate: POST auth/step-up/options and /issue carried no access
// declaration, so the global WriteGuard answered 403 role_declaration_missing
// and no admin could ever finish a step-up (every @StepUp route was dead).
import { Reflector } from '@nestjs/core';
import { WriteGuard } from '../../common/write-guard';
import { StepUpController } from './step-up.controller';

function ctxFor(handler: (...a: never[]) => unknown) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method: 'POST' }) }),
    getHandler: () => handler,
    getClass: () => StepUpController,
  } as never;
}

describe('step-up routes pass the global WriteGuard', () => {
  const guard = new WriteGuard(new Reflector());
  it.each(['options', 'issue'] as const)('POST auth/step-up/%s is declared', (name) => {
    expect(guard.canActivate(ctxFor(StepUpController.prototype[name] as never))).toBe(true);
  });
});
