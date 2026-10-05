// ACCEPTANCE — Q89 + R23 (REVIEW_REAUDIT Round 12 Phase A #5). Written by the
// reviewer before the fix; the implementing agent makes it pass and may not edit
// it. Step-up (fresh passkey) plus a named permission on every remaining money /
// privilege admin route (the Q66 list), a step-up ceremony that is single-use and
// bound to the session, and a usable admin step-up prompt.
// R23 live gate: POST auth/step-up/options and /issue carried no access
// declaration, so the global WriteGuard answered 403 role_declaration_missing
// and no admin could ever finish a step-up (every @StepUp route was dead).
import { Reflector } from '@nestjs/core';
import { WriteGuard } from '../../src/common/write-guard';
import { StepUpController } from '../../src/modules/auth/step-up.controller';

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
